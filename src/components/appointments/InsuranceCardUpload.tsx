import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, X, Image, Loader2, Check, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserAttribution } from "@/hooks/useUserAttribution";
import { cn } from "@/lib/utils";

interface InsuranceCardUploadProps {
  appointmentId: string;
  currentFrontUrl?: string | null;
  currentBackUrl?: string | null;
  onUploadComplete: (frontUrl: string | null, backUrl: string | null) => void;
  patientName: string;
  projectName?: string;
}

interface CardUploadAreaProps {
  label: string;
  currentUrl?: string | null;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

const CardUploadArea = ({
  label,
  currentUrl,
  isUploading,
  onFileSelect,
  onRemove,
}: CardUploadAreaProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex-1">
      <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      {currentUrl ? (
        <div className="relative group">
          <img
            src={currentUrl}
            alt={label}
            className="w-full h-32 object-cover rounded-lg border border-border"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-8"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Replace"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8"
              onClick={onRemove}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="absolute bottom-2 right-2 bg-green-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          {isUploading ? (
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          ) : (
            <>
              <Camera className="h-6 w-6 text-muted-foreground mb-2" />
              <span className="text-xs text-muted-foreground">Click or drag to upload</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const InsuranceCardUpload = ({
  appointmentId,
  currentFrontUrl,
  currentBackUrl,
  onUploadComplete,
  patientName,
  projectName,
}: InsuranceCardUploadProps) => {
  const { toast } = useToast();
  const { userId, userName } = useUserAttribution();
  const [frontUrl, setFrontUrl] = useState<string | null>(currentFrontUrl || null);
  const [backUrl, setBackUrl] = useState<string | null>(currentBackUrl || null);
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs always reflect latest URL — protects against stale-closure overwrites
  // when front + back saves race.
  const frontUrlRef = useRef<string | null>(currentFrontUrl || null);
  const backUrlRef = useRef<string | null>(currentBackUrl || null);
  useEffect(() => { frontUrlRef.current = frontUrl; }, [frontUrl]);
  useEffect(() => { backUrlRef.current = backUrl; }, [backUrl]);

  const uploadFile = async (file: File, side: "front" | "back"): Promise<string | null> => {
    const setUploading = side === "front" ? setIsUploadingFront : setIsUploadingBack;
    setUploading(true);

    try {
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image under 10MB",
          variant: "destructive",
        });
        return null;
      }

      // Convert HEIC/HEIF (iPhone default) to JPEG so browsers can preview it
      // and Supabase Storage serves it inline instead of as a download.
      const nameLower = file.name.toLowerCase();
      const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        nameLower.endsWith(".heic") ||
        nameLower.endsWith(".heif");

      if (isHeic) {
        try {
          toast({ title: "Converting HEIC…", description: "This can take a few seconds." });
          const heic2any = (await import("heic2any")).default;
          const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
          const blob = Array.isArray(converted) ? converted[0] : converted;
          const newName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
          file = new File([blob], newName, { type: "image/jpeg" });
        } catch (err) {
          console.error("HEIC conversion failed:", err);
          toast({
            title: "Unsupported image",
            description: "Could not convert this HEIC photo. Please upload a JPG or PNG instead.",
            variant: "destructive",
          });
          return null;
        }
      }

      // Generate unique path (accept="image/*" — HEIC is auto-converted above)
      const fileExt = file.name.split(".").pop() || "jpg";
      const sanitizedProject = (projectName || "unknown").replace(/[^a-zA-Z0-9]/g, "_");
      const filePath = `${sanitizedProject}/${appointmentId}/${side}_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("insurance-cards")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("insurance-cards")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload the image. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const persist = async (patch: { front?: string | null; back?: string | null }) => {
    const front = patch.front !== undefined ? patch.front : frontUrlRef.current;
    const back = patch.back !== undefined ? patch.back : backUrlRef.current;

    // Update refs immediately so concurrent calls read fresh values
    if (patch.front !== undefined) frontUrlRef.current = patch.front;
    if (patch.back !== undefined) backUrlRef.current = patch.back;

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke("update-appointment-fields", {
        body: {
          appointmentId,
          updates: {
            insurance_id_link: front,
            insurance_back_link: back,
          },
          userId,
          userName,
          changeSource: 'portal'
        },
      });

      if (error) throw error;

      onUploadComplete(front, back);
      toast({
        title: "Saved",
        description: "Insurance card updated successfully",
      });
    } catch (error) {
      console.error("Save failed:", error);
      toast({
        title: "Save failed",
        description: "Could not save the insurance card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFrontUpload = async (file: File) => {
    const url = await uploadFile(file, "front");
    if (url) {
      setFrontUrl(url);
      await persist({ front: url });
    }
  };

  const handleBackUpload = async (file: File) => {
    const url = await uploadFile(file, "back");
    if (url) {
      setBackUrl(url);
      await persist({ back: url });
    }
  };

  const handleRemoveFront = async () => {
    setFrontUrl(null);
    await persist({ front: null });
  };

  const handleRemoveBack = async () => {
    setBackUrl(null);
    await persist({ back: null });
  };



  return (
    <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <div className="flex items-center gap-2 mb-3">
        <Upload className="h-4 w-4 text-green-600" />
        <span className="font-medium text-sm text-green-900">Insurance Card Upload</span>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-green-600" />}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Upload photos of the insurance card (front and back) for {patientName}
      </p>
      <div className="flex gap-4">
        <CardUploadArea
          label="Front of Card"
          currentUrl={frontUrl}
          isUploading={isUploadingFront}
          onFileSelect={handleFrontUpload}
          onRemove={handleRemoveFront}
        />
        <CardUploadArea
          label="Back of Card"
          currentUrl={backUrl}
          isUploading={isUploadingBack}
          onFileSelect={handleBackUpload}
          onRemove={handleRemoveBack}
        />
      </div>
    </Card>
  );
};

export default InsuranceCardUpload;
