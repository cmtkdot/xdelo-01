export const uploadToDrive = async (blob: Blob, fileName: string, jwtToken: string) => {
  const metadata = {
    name: fileName,
    mimeType: blob.type,
    parents: ['1yCKvQtZtG33gCZaH_yTyqIOuZKeKkYet'] // Telegram Media folder
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob);

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
      body: form,
    }
  );

  if (!uploadResponse.ok) {
    const errorData = await uploadResponse.text();
    console.error('Google Drive API Error:', errorData);
    throw new Error(`Failed to upload to Google Drive: ${fileName}`);
  }

  return await uploadResponse.json();
};