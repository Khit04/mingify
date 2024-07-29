"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  aspectRatioOptions,
  creditFee,
  defaultValues,
  transformationTypes,
} from "@/constants";
import { CustomField } from "./CustomField";
import { useEffect, useState, useTransition } from "react";
import { AspectRatioKey, debounce, deepMergeObjects } from "@/lib/utils";
import MediaUploader from "./MediaUploader";
import TransformedImage from "./TransformedImage";
import { updateCredits } from "@/lib/actions/user.actions";
import { getCldImageUrl } from "next-cloudinary";
import { addImage, updateImage } from "@/lib/actions/image.actions";
import { useRouter } from "next/navigation";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
export const formSchema = z.object({
  title: z.string(),
  aspectRatio: z.string().optional(),
  color: z.string().optional(),
  prompt: z.string().optional(),
  publicId: z.string(),
});

const TransformationForm = ({
  action,
  data = null,
  userId,
  type,
  creditBalance,
  config = null,
}: TransformationFormProps) => {
  const transformationType = transformationTypes[type];
  const { toast } = useToast();
  const [image, setImage] = useState(data);
  const [newTransformation, setNewTransformation] =
    useState<Transformations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationConfig, setTransformationConfig] = useState(config);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [uploadedImageUrl, setUploadedImageUrl] = useState(
    data?.secureURL ?? null
  );
  const [version2Image, setVersion2Image] = useState<any>(
    image?.version2Image ?? null
  );
  const [currentVersion, setCurrentVersion] = useState(
    image?.version2Image ? "version2" : null
  );

  const initialValues =
    data && action === "Update"
      ? {
          title: data?.title,
          aspectRatio: data?.aspectRatio,
          color: data?.color,
          prompt: data?.prompt,
          publicId: data?.publicId,
        }
      : defaultValues;

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);

    if (data || image) {
      const transformationUrl = getCldImageUrl({
        width: image?.width,
        height: image?.height,
        src: image?.publicId,
        ...transformationConfig,
      });
      const imageData = {
        title: values.title,
        publicId: image?.publicId,
        transformationType: type,
        width: image?.width,
        height: image?.height,
        config: transformationConfig,
        secureURL: image?.secureURL,
        transformationURL: transformationUrl,
        aspectRatio: values.aspectRatio,
        prompt: values.prompt,
        color: values.color,
      };

      if (currentVersion === "version2") {
        imageData.version2Image = {
          title: values.title,
          publicId: version2Image?.publicId,
          transformationType: type,
          width: version2Image?.width,
          height: version2Image?.height,
          secureURL: version2Image?.secureURL,
          transformationURL: transformationUrl,
          aspectRatio: values.aspectRatio,
        };
      } else {
        imageData.version2Image = null;
      }

      if (action === "Add") {
        try {
          const newImage = await addImage({
            image: imageData,
            userId,
            path: "/",
          });

          if (newImage) {
            form.reset();
            setImage(data);
            router.push(`/transformations/${newImage._id}`);
          }
        } catch (error) {
          console.log(error);
        }
      }

      if (action === "Update") {
        try {
          const updatedImage = await updateImage({
            image: {
              ...imageData,
              _id: data._id,
            },
            userId,
            path: `/transformations/${data._id}`,
          });

          if (updatedImage) {
            router.push(`/transformations/${updatedImage._id}`);
          }
        } catch (error) {
          console.log(error);
        }
      }
    }

    setIsSubmitting(false);
  }

  const onSelectFieldHandler = (
    value: string,
    onChangeField: (value: string) => void
  ) => {
    const imageSize = aspectRatioOptions[value as AspectRatioKey];

    setImage((prevState: any) => ({
      ...prevState,
      aspectRatio: imageSize.aspectRatio,
      width: imageSize.width,
      height: imageSize.height,
    }));

    setNewTransformation(transformationType.config);

    return onChangeField(value);
  };

  const onInputChangeHandler = (
    fieldName: string,
    value: string,
    type: string,
    onChangeField: (value: string) => void
  ) => {
    debounce(() => {
      setNewTransformation((prevState: any) => ({
        ...prevState,
        [type]: {
          ...prevState?.[type],
          [fieldName === "prompt" ? "prompt" : "to"]: value,
        },
      }));
    }, 1000)();

    return onChangeField(value);
  };

  const onTransformHandler = async () => {
    setIsTransforming(true);
    setCurrentVersion("version1");

    setTransformationConfig(
      deepMergeObjects(newTransformation, transformationConfig)
    );

    setNewTransformation(null);

    startTransition(async () => {
      await updateCredits(userId, creditFee);
    });
  };

  useEffect(() => {
    if (image && (type === "restore" || type === "removeBackground")) {
      setNewTransformation(transformationType.config);
    }
  }, [image, transformationType.config, type]);

  const imageBgRemoveVersion2 = async () => {
    const form = new FormData();
    form.append("url", uploadedImageUrl);
    const response = await axios.post(
      "https://background-removal4.p.rapidapi.com/v1/results",
      form,
      {
        headers: {
          "X-RapidAPI-Key": process.env.NEXT_PUBLIC_RAPIDAPI_KEY,
        },
      }
    );
    const imgBase64 = response.data.results[0].entities[0].image;
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${imgBase64}`);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_PRESET_NAME);
    imageUploadToCloudinary(formData);
  };

  const imageRestoringVersion2 = async () => {
    const res = await axios.post(
      "https://api.claid.ai/v1-beta1/image/edit",
      {
        input: uploadedImageUrl,
        operations: {
          restorations: {
            upscale: "smart_enhance",
          },
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + "528488628ac14de99f296cccc03116e1",
        },
      }
    );
    const file = res.data.data.output.tmp_url;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_PRESET_NAME);
    imageUploadToCloudinary(formData);
  };

  const imageProcessWithVersion2 = async () => {
    try {
      setIsTransforming(true);
      setCurrentVersion("version2");
      if (type === "removeBackground") {
        imageBgRemoveVersion2();
      } else if (type == "restore") {
        imageRestoringVersion2();
      }
    } catch (error) {
      console.log(error);
      //   response.status(500).json({ message: "Error processing image", error });
    }
  };

  const imageUploadToCloudinary = async (formData: Object) => {
    try {
      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setVersion2Image((prevState: any) => ({
        ...prevState,
        publicId: res?.data?.public_id,
        width: res?.data?.width,
        height: res?.data?.height,
        secureURL: res?.data?.secure_url,
      }));
      setIsTransforming(false);
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {creditBalance < Math.abs(creditFee) && <InsufficientCreditsModal />}
        <CustomField
          control={form.control}
          name="title"
          formLabel="Image Title"
          className="w-full"
          render={({ field }) => <Input {...field} className="input-field" />}
        />

        {type === "fill" && (
          <CustomField
            control={form.control}
            name="aspectRatio"
            formLabel="Aspect Ratio"
            className="w-full"
            render={({ field }) => (
              <Select
                onValueChange={(value) =>
                  onSelectFieldHandler(value, field.onChange)
                }
                value={field.value}
              >
                <SelectTrigger className="select-field">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(aspectRatioOptions).map((key) => (
                    <SelectItem key={key} value={key} className="select-item">
                      {aspectRatioOptions[key as AspectRatioKey].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}

        {(type === "remove" || type === "recolor") && (
          <div className="prompt-field">
            <CustomField
              control={form.control}
              name="prompt"
              formLabel={
                type === "remove" ? "Object to remove" : "Object to recolor"
              }
              className="w-full"
              render={({ field }) => (
                <Input
                  value={field.value}
                  className="input-field"
                  onChange={(e) =>
                    onInputChangeHandler(
                      "prompt",
                      e.target.value,
                      type,
                      field.onChange
                    )
                  }
                />
              )}
            />

            {type === "recolor" && (
              <CustomField
                control={form.control}
                name="color"
                formLabel="Replacement Color"
                className="w-full"
                render={({ field }) => (
                  <Input
                    value={field.value}
                    className="input-field"
                    onChange={(e) =>
                      onInputChangeHandler(
                        "color",
                        e.target.value,
                        "recolor",
                        field.onChange
                      )
                    }
                  />
                )}
              />
            )}
          </div>
        )}

        <div className="media-uploader-field">
          <CustomField
            control={form.control}
            name="publicId"
            className="flex size-full flex-col"
            render={({ field }) => (
              <MediaUploader
                onValueChange={field.onChange}
                setImage={setImage}
                setUploadedImageUrl={setUploadedImageUrl}
                publicId={field.value}
                image={image}
                type={type}
              />
            )}
          />

          <TransformedImage
            image={image}
            type={type}
            setImage={setImage}
            uploadedImageUrl={uploadedImageUrl}
            title={form.getValues().title}
            isTransforming={isTransforming}
            setIsTransforming={setIsTransforming}
            transformationConfig={transformationConfig}
            setVersion2Image={setVersion2Image}
            version2Image={version2Image}
            currentVersion={currentVersion}
            setCurrentVersion={setCurrentVersion}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Button
            type="button"
            className="submit-button capitalize"
            disabled={isTransforming || newTransformation === null}
            onClick={onTransformHandler}
          >
            {isTransforming && currentVersion === "version1"
              ? "Transforming..."
              : " Apply Transformation with Version 1"}
          </Button>
          <Button
            type="button"
            className="submit-button capitalize"
            disabled={isTransforming || version2Image !== null}
            onClick={imageProcessWithVersion2}
          >
            {isTransforming && currentVersion === "version2"
              ? "Transforming..."
              : "Apply Transformation With Version 2"}
          </Button>
          <Button
            type="submit"
            className="submit-button capitalize"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Save Image"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default TransformationForm;
