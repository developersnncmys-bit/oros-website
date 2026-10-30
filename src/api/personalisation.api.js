import api from "@/lib/axios";

/** POST /personalisation/logo -> { url, publicId, originalName, size, mimetype } */
export const uploadPersonalisationLogo = (file) => {
  const formData = new FormData();
  formData.append("logo", file);
  return api.post("/personalisation/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
