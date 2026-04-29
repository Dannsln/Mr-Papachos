import * as API from "../api";

export const downloadWithAuth = async (url, filename) => {
  const res = await fetch(url, {
    headers: {
      ...(API.getAuthToken() ? { Authorization: `Bearer ${API.getAuthToken()}` } : {}),
    },
  });

  if (!res.ok) throw new Error("No se pudo descargar el archivo");

  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
};
