"use client";
import { useToast } from "@/components/ui/use-toast";
import { dataUrl, getImageSize } from "@/lib/utils";
import { CldImage, CldUploadWidget, getCldImageUrl } from "next-cloudinary";
import { PlaceholderValue } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";

type MediaUploaderProps = {
  onValueChange: (value: string) => void;
  setImage: React.Dispatch<any>;
  publicId: string;
  image: any;
  type: string;
  setUploadedImageUrl: any;
};

const MediaUploader = ({
  onValueChange,
  setImage,
  image,
  publicId,
  type,
  setUploadedImageUrl,
}: MediaUploaderProps) => {
  const { toast } = useToast();
  const onUploadSuccessHandler = (result: any) => {
    setImage((prevState: any) => ({
      ...prevState,
      publicId: result?.info?.public_id,
      width: result?.info?.width,
      height: result?.info?.height,
      secureURL: result?.info?.secure_url,
    }));

    setUploadedImageUrl(result?.info?.secure_url);

    onValueChange(result?.info?.public_id);

    toast({
      title: "Image Upload Successfully",
      description: "1 Credit was destructed from your account",
      duration: 5000,
      className: "success-toast",
    });
  };

  const onUploadErrorHandler = () => {
    toast({
      title: "Something was Wrong while Uploading",
      description: "Please Try Again",
      duration: 5000,
      className: "error-toast",
    });
  };
  //kst_mingify
  return (
    <CldUploadWidget
      uploadPreset={process.env.NEXT_PUBLIC_PRESET_NAME}
      options={{
        multiple: false,
        resourceType: "image",
      }}
      onSuccess={onUploadSuccessHandler}
      onError={onUploadErrorHandler}
    >
      {({ open }) => (
        <div className="flex flex-col gap-4">
          <h3 className="h3-bold text-dark-600">Original</h3>

          {publicId ? (
            <>
              <div className="cursor-auto overflow-hidden rounded-[10px]">
                <CldImage
                  width={getImageSize(type, image, "width")}
                  height={getImageSize(type, image, "height")}
                  src={publicId}
                  alt="image"
                  sizes={"(max-width: 767px) 100vw, 50vw"}
                  placeholder={dataUrl as PlaceholderValue}
                  className="media-uploader_cldImage"
                />
              </div>
            </>
          ) : (
            <div className="media-uploader_cta" onClick={() => open()}>
              <div className="media-uploader_cta-image">
                <Image
                  src="/assets/icons/add.svg"
                  alt="Add Image"
                  width={24}
                  height={24}
                />
              </div>
              <p className="p-14-medium">Click Here to Upload Image</p>
            </div>
          )}
        </div>
      )}
    </CldUploadWidget>
  );
};

export default MediaUploader;
