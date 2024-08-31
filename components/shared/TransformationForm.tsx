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
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  aspectRatioOptions,
  creditFee,
  defaultValues,
  transformationTypes,
} from "@/constants";
import { CustomField } from "./CustomField";
import { useEffect, useState, useTransition } from "react";
import {
  AspectRatioKey,
  dataUrl,
  debounce,
  deepMergeObjects,
  getImageSize,
} from "@/lib/utils";
import MediaUploader from "./MediaUploader";
import TransformedImage from "./TransformedImage";
import { updateCredits } from "@/lib/actions/user.actions";
import { CldImage, getCldImageUrl } from "next-cloudinary";
import {
  addImage,
  objectRemove,
  recolor,
  updateImage,
} from "@/lib/actions/image.actions";
import { useRouter } from "next/navigation";
import { InsufficientCreditsModal } from "./InsufficientCreditsModal";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import { PlaceholderValue } from "next/dist/shared/lib/get-img-props";
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
  const [version1Image, setVersion1Image] = useState(
    image?.version1Image ?? null
  );
  const [version2Image, setVersion2Image] = useState<any>(
    image?.version2Image ?? null
  );
  const [newTransformation, setNewTransformation] =
    useState<Transformations | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformationConfig, setTransformationConfig] = useState(config);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [version1ImageStartTime, setVersion1ImageStartTime] = useState<
    number | null
  >(null);
  const [version1ImageEndTime, setVersion1ImageEndTime] = useState<
    number | null
  >(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(
    data?.secureURL ?? null
  );
  const [version1FetchTime, setVersion1FetchTime] = useState<number | null>(
    null
  );
  const [version2FetchTime, setVersion2FetchTime] = useState<number | null>(
    null
  );
  const [currentVersion, setCurrentVersion] = useState(
    image ? (image?.version1Image ? "version1" : "version2") : null
  );
  const [currentSelectedVersion, setCurrentSelectedVersion] =
    useState("version1");
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  const initialValues =
    data && action === "Update"
      ? {
          title: data?.title,
          aspectRatio: data?.aspectRatio ?? "",
          color: data?.color ?? "",
          prompt: data?.prompt ?? "",
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
      const imageData = {
        title: values.title,
        publicId: image?.publicId,
        transformationType: type,
        width: image?.width,
        height: image?.height,
        config: {},
        secureURL: image?.secureURL,
        transformationURL: null,
        aspectRatio: null,
        prompt: null,
        color: null,
      } as any;
      if (currentVersion === "version1") {
        const transformationUrl = getCldImageUrl({
          width: version1Image?.width,
          height: version1Image?.height,
          src: version1Image?.publicId,
          ...transformationConfig,
        });
        imageData.version1Image = {
          title: values.title,
          publicId: version1Image?.publicId,
          transformationType: type,
          width: version1Image?.width,
          height: version1Image?.height,
          config: transformationConfig,
          secureURL: image?.secureURL,
          transformationUrl,
          aspectRatio: values.aspectRatio,
          prompt: values.prompt,
          color: values.color,
        };
        imageData.version2Image = null;
      }

      if (currentVersion === "version2") {
        imageData.version2Image = {
          title: values.title,
          publicId: version2Image?.publicId,
          transformationType: type,
          width: version2Image?.width,
          height: version2Image?.height,
          secureURL: version2Image?.secureURL,
          transformationURL: null,
          aspectRatio: values.aspectRatio,
        };
        imageData.version1Image = null;
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
    setVersion1ImageStartTime(Date.now());
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
    const startTime = Date.now();
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
    const endTime = Date.now();
    setVersion2FetchTime(endTime - startTime);
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${imgBase64}`);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_PRESET_NAME as string
    );
    imageUploadToCloudinary(formData);
  };

  const imageRestoringVersion2 = async () => {
    const startTime = Date.now();
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
    const endTime = Date.now();
    const requestTime = endTime - startTime;
    const file = res.data.data.output.tmp_url;
    setVersion2FetchTime(requestTime);
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_PRESET_NAME as string
    );
    imageUploadToCloudinary(formData);
  };

  const imageRecolorVersion2 = async () => {
    objectRemove(uploadedImageUrl);
  };

  const imageProcessWithVersion2 = async () => {
    try {
      setIsTransforming(true);
      setCurrentVersion("version2");
      if (type === "removeBackground") {
        imageBgRemoveVersion2();
      } else if (type == "restore") {
        imageRestoringVersion2();
      } else if (type == "recolor") {
        imageRecolorVersion2();
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

  useEffect(() => {
    if (image && !image?.version1Image && currentVersion === "version1") {
      setVersion1Image((prev: any) => {
        return {
          ...prev,
          publicId: image?.publicId,
          width: image?.width,
          height: image?.height,
          secureURL: image?.secureURL,
        };
      });
    }
  }, [image, currentVersion]);

  return (
    <div>
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
                <>
                  <MediaUploader
                    onValueChange={field.onChange}
                    setImage={setImage}
                    setUploadedImageUrl={setUploadedImageUrl}
                    publicId={field.value}
                    image={image}
                    type={type}
                  />
                </>
              )}
            />

            <TransformedImage
              action={null}
              image={image}
              type={type}
              title={form.getValues().title}
              isTransforming={isTransforming}
              setIsTransforming={setIsTransforming}
              transformationConfig={transformationConfig}
              version1Image={version1Image}
              version2Image={version2Image}
              currentVersion={currentVersion}
              setCurrentVersion={setCurrentVersion}
              isComparisonOpen={isComparisonOpen}
              setIsComparisonOpen={setIsComparisonOpen}
              version1ImageStartTime={version1ImageStartTime}
              version1ImageEndTime={version1ImageStartTime}
              setVersion1ImageEndTime={setVersion1ImageEndTime}
              setVersion1FetchTime={setVersion1FetchTime}
            />
          </div>

          <div className="flex flex-col gap-4">
            <Button
              type="button"
              className="submit-button capitalize"
              disabled={
                isTransforming || newTransformation === null || version1Image
              }
              onClick={onTransformHandler}
            >
              {isTransforming && currentVersion === "version1"
                ? "Transforming..."
                : " Apply Transformation"}
            </Button>
            {
              type == "removeBackground" || type == "restore" ? (
                <Button
                  type="button"
                  className="submit-button capitalize"
                  disabled={
                    isTransforming ||
                    version2Image !== null ||
                    version2Image ||
                    uploadedImageUrl === null
                  }
                  onClick={imageProcessWithVersion2}
                >
                  {isTransforming && currentVersion === "version2"
                    ? "Transforming..."
                    : "Try another result"}
                </Button>
              ) : null
            }
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
      {isComparisonOpen ? (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
          <div className="w-[70%] mx-auto bg-white px-5 py-10 rounded-lg">
            <h1 className="text-black font-bold text-2xl pb-4 text-center ">
              Comparison Modal
            </h1>
            <div className="flex items-center gap-5">
              <div className="basis-[50%]">
                <h1 className="pb-3">
                  Version 1{" "}
                  <span className="text-sm pl-3">
                    (Fetch Time : {version1FetchTime}ms)
                  </span>
                </h1>
                <div
                  onClick={() => setCurrentSelectedVersion("version1")}
                  className={`${
                    currentSelectedVersion == "version1"
                      ? "border-2 border-blue-500 rounded-xl"
                      : ""
                  }`}
                >
                  <CldImage
                    width={getImageSize(type, version1Image, "width")}
                    height={getImageSize(type, version1Image, "height")}
                    src={version1Image?.publicId}
                    alt={version1Image?.title}
                    sizes={"(max-width: 767px) 100vw, 50vw"}
                    placeholder={dataUrl as PlaceholderValue}
                    className="transformed-image"
                    onLoad={() => {
                      setIsTransforming && setIsTransforming(false);
                    }}
                    onError={() => {
                      debounce(() => {
                        setIsTransforming && setIsTransforming(false);
                      }, 8000)();
                    }}
                    {...transformationConfig}
                  />
                </div>
              </div>
              <div className="basis-[50%]">
                <h1 className="pb-3">
                  Version 2{" "}
                  <span className="text-sm pl-3">
                    (Fetch Time : {version2FetchTime}ms)
                  </span>
                </h1>
                <div
                  onClick={() => setCurrentSelectedVersion("version2")}
                  className={`${
                    currentSelectedVersion == "version2"
                      ? "border-2 border-blue-500 rounded-xl"
                      : ""
                  }`}
                >
                  <CldImage
                    width={getImageSize(type, version2Image, "width")}
                    height={getImageSize(type, version2Image, "height")}
                    src={version2Image?.publicId}
                    alt={version2Image?.title}
                    sizes={"(max-width: 767px) 100vw, 50vw"}
                    placeholder={dataUrl as PlaceholderValue}
                    className="transformed-image"
                    onLoad={() => {
                      setIsTransforming && setIsTransforming(false);
                    }}
                    onError={() => {
                      debounce(() => {
                        setIsTransforming && setIsTransforming(false);
                      }, 8000)();
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-5 gap-3">
              <Button type="button" onClick={() => setIsComparisonOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setCurrentVersion(currentSelectedVersion);
                  setIsComparisonOpen(false);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default TransformationForm;
