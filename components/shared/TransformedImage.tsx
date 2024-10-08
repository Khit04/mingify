"use client";

import { dataUrl, debounce, download, getImageSize } from "@/lib/utils";
import { CldImage, getCldImageUrl } from "next-cloudinary";
import { PlaceholderValue } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import React from "react";

const TransformedImage = ({
  image,
  type,
  title,
  transformationConfig,
  isTransforming,
  setIsTransforming,
  hasDownload = true,
  version1Image,
  version2Image,
  currentVersion,
  setCurrentVersion,
  action = null,
  isComparisonOpen,
  setIsComparisonOpen,
  version1ImageStartTime,
  version1ImageEndTime,
  setVersion1ImageEndTime,
  setVersion1FetchTime,
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
            width: version1Image?.width,
            height: version1Image?.height,
            src: version1Image?.publicId,
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
            {type == "removeBackground" || type == "restore" ? (
              <button
                onClick={() => setCurrentVersion("version1")}
                type="button"
                disabled={version1Image == null}
                className={`bg-primary py-1 px-3  border-2 font-medium text-white rounded-md ${
                  version1Image == null
                    ? "cursor-not-allowed opacity-40"
                    : "opacity-100"
                } ${
                  currentVersion === "version1"
                    ? "border-blue-400"
                    : "border-transparent"
                }`}
              >
                img1
              </button>
            ) : null}
            {type == "removeBackground" || type == "restore" ? (
              <button
                type="button"
                onClick={() => setCurrentVersion("version2")}
                disabled={version2Image == null}
                className={`bg-primary py-1 px-3 border-2  font-medium text-white rounded-md ${
                  version2Image == null
                    ? "cursor-not-allowed opacity-40"
                    : "opacity-100"
                } ${
                  currentVersion === "version2"
                    ? "border-blue-400"
                    : "border-transparent"
                }`}
              >
                img2
              </button>
            ) : null}

            {type == "removeBackground" || type == "restore" ? (
              <button
                type="button"
                onClick={() => setIsComparisonOpen(true)}
                disabled={version2Image == null || version1Image == null}
                className={`bg-primary py-1 px-3 border-2  font-medium text-white rounded-md ${
                  version1Image == null || version2Image == null
                    ? "cursor-not-allowed opacity-40"
                    : "opacity-100"
                }`}
              >
                <img
                  src="/assets/icons/left-and-right-arrows.png"
                  alt="Compare"
                  className="w-6 h-6"
                />
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
      {(version1Image !== null || version2Image !== null) &&
      currentVersion !== null ? (
        <div className="relative">
          {currentVersion === "version2" ? (
            version2Image !== null ? (
              <>
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
              </>
            ) : (
              <div
                className="transformed-placeholder"
                style={{ backgroundColor: "#7885AB" }}
              >
                {/* <Image src={dataUrl} height={288} alt="placeholder" width={100} /> */}
              </div>
            )
          ) : null}

          {currentVersion == "version1" && version1Image !== null ? (
            <CldImage
              width={getImageSize(type, version1Image, "width")}
              height={getImageSize(type, version1Image, "height")}
              src={version1Image?.publicId}
              alt={version1Image?.title}
              sizes={"(max-width: 767px) 100vw, 50vw"}
              placeholder={dataUrl as PlaceholderValue}
              className="transformed-image"
              onLoad={() => {
                if (setVersion1FetchTime) {
                  setVersion1ImageEndTime((prev: any) => Date.now());
                }
                if (setVersion1FetchTime) {
                  setVersion1FetchTime(Date.now() - version1ImageStartTime);
                }
                setIsTransforming && setIsTransforming(false);
              }}
              onError={() => {
                debounce(() => {
                  setIsTransforming && setIsTransforming(false);
                }, 8000)();
              }}
              {...transformationConfig}
            />
          ) : null}

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
