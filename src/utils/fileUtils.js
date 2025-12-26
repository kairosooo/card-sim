/**
 * Converts a File or Blob object to a Base64 data URL.
 * @param {Blob|File} file - The file to convert.
 * @returns {Promise<string>} - A promise that resolves with the Base64 string.
 */
export const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
    });
};
