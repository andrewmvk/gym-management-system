const apiUrl = process.env.NEXT_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('Invalid environment configuration: NEXT_PUBLIC_API_URL is missing');
}

export const API_URL = apiUrl;
