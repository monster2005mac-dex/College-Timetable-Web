import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase";

export const storage = getStorage(app);

export async function uploadUserWallpaper(userId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `users/${userId}/wallpaper.jpg`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
