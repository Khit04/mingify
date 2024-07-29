"use client";

import { dataUrl, debounce, download, getImageSize } from "@/lib/utils";
import { CldImage, getCldImageUrl } from "next-cloudinary";
import { PlaceholderValue } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import React from "react";
import axios from "axios";

const TransformedImage = ({
  image,
  type,
  title,
  transformationConfig,
  isTransforming,
  setIsTransforming,
  hasDownload = true,
  version2Image,
  currentVersion,
  setCurrentVersion,
  action = null,
}: TransformedImageProps) => {
  const downloadHandler = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    download(
      version2Image !== null
        ? getCldImageUrl({
            width: version2Image?.width,
            height: version2Image?.height,
            src: version2Image?.publicId,
          })
        : getCldImageUrl({
            width: image?.width,
            height: image?.height,
            src: image?.publicId,
            ...transformationConfig,
          }),
      title
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex-between">
        <h3 className="h3-bold text-dark-600">Transformed</h3>
        {action !== "update" ? (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentVersion("version1")}
              type="button"
              disabled={transformationConfig == null}
              className={`bg-primary py-3 px-5  border-2 font-medium text-white rounded-md ${
                transformationConfig === null
                  ? "cursor-not-allowed opacity-40"
                  : "opacity-100"
              } ${
                currentVersion === "version1"
                  ? "border-blue-400"
                  : "border-transparent"
              }`}
            >
              Version 1
            </button>
            {type == "removeBackground" || type == "restore" ? (
              <button
                type="button"
                onClick={() => setCurrentVersion("version2")}
                disabled={version2Image == null}
                className={`bg-primary py-3 px-5 border-2  font-medium text-white rounded-md ${
                  version2Image == null
                    ? "cursor-not-allowed opacity-40"
                    : "opacity-100"
                } ${
                  currentVersion === "version2"
                    ? "border-blue-400"
                    : "border-transparent"
                }`}
              >
                Version 2
              </button>
            ) : null}
          </div>
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

      {!!(image?.publicId || version2Image?.publicId) &&
      (transformationConfig ||
        currentVersion === "version2" ||
        (image?.prompt === "" && action == "update")) ? (
        <div className="relative">
          {currentVersion === "version2" || version2Image !== null ? (
            <CldImage
              width={getImageSize(type, version2Image, "width")}
              height={getImageSize(type, version2Image, "height")}
              src={version2Image?.publicId}
              alt={version2Image?.title}
              sizes={"(max-width: 767px) 100vw, 50vw"}
              placeholder={dataUrl as PlaceholderValue}
              className="transformed-image"
              onError={() => {
                debounce(() => {
                  setIsTransforming && setIsTransforming(false);
                }, 8000)();
              }}
            />
          ) : (
            <CldImage
              width={getImageSize(type, image, "width")}
              height={getImageSize(type, image, "height")}
              src={image?.publicId}
              alt={image?.title}
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
          )}

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
