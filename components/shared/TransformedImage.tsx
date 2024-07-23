"use client";

import { dataUrl, debounce, download, getImageSize } from "@/lib/utils";
import { CldImage, getCldImageUrl } from "next-cloudinary";
import { PlaceholderValue } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import React, { useState } from "react";
import axios from "axios";
import { deepMergeObjects } from "@/lib/utils";

const TransformedImage = ({
  image,
  type,
  title,
  transformationConfig,
  isTransforming,
  setIsTransforming,
  hasDownload = true,
  uploadedImageUrl = null,
  setImage,
  newTransformation,
  setTransformationConfig,
}: TransformedImageProps) => {
  const downloadHandler = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    download(
      getCldImageUrl({
        width: image?.width,
        height: image?.height,
        src: image?.publicId,
        ...transformationConfig,
      }),
      title
    );
  };

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
          Authorization: "Bearer " + "b94d214bf9c247f5ae0aabccde7d2d75",
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
      setTransformationConfig(
        deepMergeObjects(newTransformation, transformationConfig)
      );
      if (type === "remove") {
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
      setImage((prevState: any) => ({
        ...prevState,
        publicId: res?.data?.public_id,
        width: res?.data?.width,
        height: res?.data?.height,
        secureURL: res?.data?.secure_url,
      }));
    } catch (e) {
      console.log(e);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex-between">
        <h3 className="h3-bold text-dark-600">Transformed</h3>
        {type == "remove" || type == "restore" ? (
          <button
            onClick={imageProcessWithVersion2}
            disabled={isTransforming || newTransformation === null}
            className={`bg-primary py-3 px-5 font-medium text-white rounded-md ${
              isTransforming || newTransformation === null
                ? "cursor-not-allowed"
                : ""
            }`}
          >
            Version 2
          </button>
        ) : null}

        {hasDownload && (
          <button className="download-btn" onClick={downloadHandler}>
            <Image
              src="/assets/icons/download.svg"
              alt="Download"
              width={24}
              height={24}
              className="pb-[6px]"
            />
          </button>
        )}
      </div>

      {image?.publicId && transformationConfig ? (
        <div className="relative">
          <CldImage
            width={getImageSize(type, image, "width")}
            height={getImageSize(type, image, "height")}
            src={image?.publicId}
            alt={image.title}
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

          {isTransforming && (
            <div className="transforming-loader">
              <Image
                src="/assets/icons/spinner.svg"
                width={50}
                height={50}
                alt="spinner"
              />
              <p className="text-white/80">Please wait...</p>
            </div>
          )}
        </div>
      ) : (
        <div className="transformed-placeholder">Transformed Image</div>
      )}
    </div>
  );
};

export default TransformedImage;
