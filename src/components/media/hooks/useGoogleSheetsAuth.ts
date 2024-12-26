import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";

const CLIENT_ID = '977351558653-ohvqd6j78cbei8aufarbdsoskqql05s1.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

export const useGoogleSheetsAuth = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const initializeGoogleSheetsAPI = async () => {
    try {
      console.log('Starting Google Sheets API initialization...');
      
      // Load the Google Identity Services script
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.body.appendChild(script);
      });

      // Initialize the Google API client
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client', async () => {
            try {
              await window.gapi.client.init({
                discoveryDocs: [DISCOVERY_DOC],
              });
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        };
        script.onerror = () => reject(new Error('Failed to load Google API'));
        document.body.appendChild(script);
      });

      // Initialize Google Identity Services client
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
          if (response.error) {
            throw new Error(response.error);
          }
          
          // Set access token
          window.gapi.client.setToken(response);
          setIsInitialized(true);
          
          console.log('Google Sheets API initialized successfully');
        },
      });

      // Request user authorization
      client.requestAccessToken();

    } catch (error) {
      console.error('Error initializing Google Sheets API:', error);
      toast({
        title: "Error",
        description: "Failed to initialize Google Sheets API. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    isInitialized,
    initializeGoogleSheetsAPI,
  };
};