import { apiClient } from "@/lib/api-client";

export const mediaApi = {
  async upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await apiClient.post<{ url: string; mimeType: string; sizeBytes: number }>("/media/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
};
