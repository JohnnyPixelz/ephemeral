"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import axios from "axios";
import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { v4 } from "uuid";

export default function Page() {
  return (
    <div className="min-h-screen bg-black">
      <div className="space-y-12 max-w-md w-full px-4 mx-auto pt-[100px]">
        <p className="text-center text-4xl text-white font-semibold">ephemeral.</p>

        <UploadCard />
      </div>
    </div>
  );
}

interface EphemeralFile {
  id: string;
  date: number;
  file: File;
  progress: number;
  url?: string;
}

function UploadCard() {
  const [ephemeralFiles, setEphemeralFiles] = useState<EphemeralFile[]>([]);
  const [origin, setOrigin] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      console.log(event.target.files);
      const newFiles: EphemeralFile[] = Array.from(event.target.files).map((file) => ({
        id: v4(),
        date: Date.now(),
        file,
        progress: 0,
      }));
      setEphemeralFiles([...ephemeralFiles, ...newFiles]);
      newFiles.forEach(handleUpload);
      event.target.value = "";
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const newFiles: EphemeralFile[] = Array.from(event.dataTransfer.files).map((file) => ({
        id: v4(),
        date: Date.now(),
        file,
        progress: 0,
      }));
      setEphemeralFiles([...ephemeralFiles, ...newFiles]);

      newFiles.forEach(handleUpload);
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleUpload = async (ephemeralFile: EphemeralFile) => {

    axios.request({
      method: "post",
      url: "/upload",
      headers: {
        'Content-Type': ephemeralFile.file.type, // Set the file type
        'Content-Disposition': `attachment; filename="${ephemeralFile.file.name}"`, // Set the filename
        'X-Filename': ephemeralFile.file.name,
      },
      data: ephemeralFile.file,
      onUploadProgress: (p) => {
        // console.log(p);
        setEphemeralFiles(files => files.map(file => {
          if (file.id != ephemeralFile.id) return file;
          if (file.progress >= 100) return file;

          file.progress = (p.loaded / (p.total || ephemeralFile.file.size)) * 100;
          return file;
        }));
      }
    }).then(data => {
      console.log(data);
      setEphemeralFiles(files => files.map(file => {
        if (file.id != ephemeralFile.id) return file;
  
        file.url = data.data.url;
        return file;
      }));
    });
  }

  useEffect(() => {
    setOrigin(`${window.location.protocol}//${window.location.host}`);
  }, []);

  return (
    <div className="space-y-3">
      <Card className="w-full max-w-md">
        <CardContent className="w-full flex items-center justify-center p-12">
          <div
            className="text-center"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Drag and drop your file here, or</p>
            <input
              type="file"
              className="hidden"
              multiple
              ref={inputRef}
              onChange={handleFileChange}
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button onClick={() => inputRef.current?.click()} variant="link" className="mt-2">
                Browse
              </Button>
            </label>
          </div>
          {/* {isUploading && (
          <div className={cn(contentStyle)}>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Uploading...</p>
          </div>
        )}
        {isUploaded && (
          <div className={cn(contentStyle)}>
            <Check className="mx-auto h-12 w-12 text-green-500" />
            <p className="mt-4 text-gray-600">File uploaded successfully!</p>
          </div>
        )} */}
        </CardContent>
      </Card>

      {ephemeralFiles.toSorted((a, b) => b.date - a.date).map((file, key) => (
        <Card key={key} className="w-full max-w-md">
          <CardContent className="w-full pt-2 space-y-3">
            <p className="text-lg">{file.file.name}</p>
            {/* <Progress value={file.progress} /> */}

            {!file.url && (
              <Progress value={file.progress} />
            )}
            {file.url && (
              <a href={`${origin}${file.url}`} target="_blank" className="inline-block leading-4 text-gray-400 hover:underline hover:cursor-pointer">{origin}{file.url}</a>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
