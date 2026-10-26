export function buildVisitorFormData(
  params: Record<string, unknown>,
  profileImage?: File | null,
): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    formData.append(`visitor[${key}]`, String(value));
  }

  if (profileImage) formData.append("visitor[profile_image]", profileImage);

  return formData;
}
