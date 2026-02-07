import { useState, useRef, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Crop as CropIcon, Upload, X, Image as ImageIcon } from "lucide-react";

export type CropPreset = "square" | "banner";

interface CropConfig {
  aspect: number;
  width: number;
  height: number;
  label: string;
  description: string;
}

const CROP_PRESETS: Record<CropPreset, CropConfig> = {
  square: {
    aspect: 1,
    width: 1080,
    height: 1080,
    label: "Square (1:1)",
    description: "1080×1080px - Menu items, food cards, offers",
  },
  banner: {
    aspect: 16 / 9,
    width: 1200,
    height: 675,
    label: "Banner (16:9)",
    description: "1200×675px - Shop banner, top food images",
  },
};

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

interface ImageCropperProps {
  onCropComplete: (croppedBlob: Blob) => void;
  defaultPreset?: CropPreset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
}

export function ImageCropper({
  onCropComplete,
  defaultPreset = "square",
  open,
  onOpenChange,
  imageSrc,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [preset, setPreset] = useState<CropPreset>(defaultPreset);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const config = CROP_PRESETS[preset];

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, config.aspect));
    },
    [config.aspect]
  );

  const handlePresetChange = (value: CropPreset) => {
    setPreset(value);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, CROP_PRESETS[value].aspect));
    }
  };

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    if (!imgRef.current || !crop) return null;

    const image = imgRef.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
      x: (crop.x / 100) * image.width * scaleX,
      y: (crop.y / 100) * image.height * scaleY,
      width: (crop.width / 100) * image.width * scaleX,
      height: (crop.height / 100) * image.height * scaleY,
    };

    canvas.width = config.width;
    canvas.height = config.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      config.width,
      config.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        "image/jpeg",
        0.9
      );
    });
  }, [crop, config]);

  const handleCrop = async () => {
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            Crop Image
          </DialogTitle>
          <DialogDescription>
            Select a crop ratio and adjust the area to crop
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Select Crop Ratio</Label>
            <RadioGroup
              value={preset}
              onValueChange={(v) => handlePresetChange(v as CropPreset)}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              {(Object.entries(CROP_PRESETS) as [CropPreset, CropConfig][]).map(
                ([key, value]) => (
                  <div key={key} className="relative">
                    <RadioGroupItem
                      value={key}
                      id={key}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={key}
                      className="flex flex-col gap-1 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer"
                      data-testid={`radio-crop-${key}`}
                    >
                      <span className="font-medium">{value.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {value.description}
                      </span>
                    </Label>
                  </div>
                )
              )}
            </RadioGroup>
          </div>

          <div className="flex justify-center bg-muted rounded-lg p-4">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              aspect={config.aspect}
              className="max-h-[400px]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                className="max-h-[400px] object-contain"
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Output size: {config.width} × {config.height} pixels
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-crop"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCrop}
            disabled={isProcessing || !crop}
            data-testid="button-apply-crop"
          >
            {isProcessing ? "Processing..." : "Apply Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ImageUploadWithCropProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  onUpload: (blob: Blob) => Promise<string>;
  isUploading: boolean;
  defaultPreset?: CropPreset;
  previewClassName?: string;
}

export function ImageUploadWithCrop({
  imageUrl,
  onImageChange,
  onUpload,
  isUploading,
  defaultPreset = "square",
  previewClassName = "w-32 h-32",
}: ImageUploadWithCropProps) {
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    try {
      const url = await onUpload(croppedBlob);
      onImageChange(url);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <div className="space-y-3">
      {imageUrl ? (
        <div className={`relative rounded-lg overflow-hidden border border-border ${previewClassName}`}>
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => onImageChange("")}
            data-testid="button-remove-image"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          className={`rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors ${previewClassName}`}
          onClick={() => fileInputRef.current?.click()}
          data-testid="button-upload-image"
        >
          {isUploading ? (
            <div className="animate-pulse text-muted-foreground text-sm">Uploading...</div>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <span className="text-xs text-muted-foreground">Click to upload</span>
            </>
          )}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="input-image-file"
      />
      <p className="text-xs text-muted-foreground">
        PNG, JPG, GIF up to 5MB. Image will be cropped to fit.
      </p>

      {tempImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
          defaultPreset={defaultPreset}
        />
      )}
    </div>
  );
}
