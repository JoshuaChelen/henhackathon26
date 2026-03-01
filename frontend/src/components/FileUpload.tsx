import { useState } from "react";
import type { ChangeEvent } from "react";
import uploadImg from "../assets/thehalaldesign-upload-6699084.png";
import { createClient } from "@supabase/supabase-js";



interface FileUploadProps {
  onChange?: (file: File | null) => void;
}

export default function FileUpload({ onChange }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const applyFile = (selected: File | null) => {
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      onChange && onChange(selected);
    } else {
      setFile(null);
      setPreviewUrl(null);
      onChange && onChange(null);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files && e.target.files[0];
    applyFile(selected || null);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setUploading(true);
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
      const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const BUCKET = "unprocessed_vids";

      if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Supabase env vars not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)");
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      console.log("Uploading to bucket:", BUCKET);
      const filename = `${Date.now()}_${file.name}`;

      const { data, error } = await supabase.storage.from(BUCKET).upload(filename, file, {
        contentType: file.type,
        upsert: false,
      });

      if (error) {
        console.error("Supabase upload error:", error);
        console.error("Bucket name tried:", BUCKET);
        throw error;
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
      console.log("upload succeeded", data, publicData);
      setMessage("Upload succeeded!");
      // Optionally clear selected file / preview
      // setFile(null);
      // setPreviewUrl(null);
      
    } catch (err) {
      console.error(err);
      alert("Upload failed: " + (err as any)?.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files && e.dataTransfer.files[0];
    if (dropped) {
      applyFile(dropped);
    }
  };

  return (
    <div className="file-upload">
      <div
        onClick={() => document.getElementById("video-upload")?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-50 dark:bg-gray-900/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition p-4 ${
          dragging
            ? "border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/50"
            : "border-gray-300 dark:border-gray-700"
        }`}
      >
        {!previewUrl && (
          <img
            src={uploadImg}
            alt="Upload"
            className="mb-2 h-20 w-auto object-contain"
          />
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400">
          {file ? file.name : "Upload File"}
        </p>

        {previewUrl && (
          <video
            src={previewUrl}
            controls
            className="mt-2 max-h-full max-w-full"
          />
        )}
      </div>

      <input
        id="video-upload"
        type="file"
        accept="video/mp4"
        onChange={handleFileChange}
        className="hidden"
      />

      {file && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={handleUpload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Upload
          </button>
        </div>)}
        {message && (
          <p className="mt-2 text-green-600 text-center">{message}</p>
        )}
      </div>
  );
}

