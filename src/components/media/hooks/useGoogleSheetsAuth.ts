import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const CLIENT_ID = '977351558653-ohvqd6j78cbei8aufarbdsoskqql05s1.apps.googleusercontent.com';

export const useGoogleSheetsAuth = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const initializeGoogleSheetsAPI = async () => {
    try {
      console.log('Starting Google Sheets API initialization...');
      
      // Load the Google API client library
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google API'));
        document.body.appendChild(script);
      });

      // Load the Google Identity Services library
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.body.appendChild(script);
      });

      // Initialize the client with OAuth
      await window.gapi.load('client:auth2', async () => {
        try {
          await window.gapi.client.init({
            clientId: CLIENT_ID,
            scope: SCOPES,
            discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          });

          // Set up the Identity Services client
          const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response) => {
              if (response.error) {
                throw new Error(response.error);
              }
              setIsInitialized(true);
            },
          });

          // Request user authorization
          if (!window.gapi.auth2.getAuthInstance().isSignedIn.get()) {
            tokenClient.requestAccessToken();
          } else {
            setIsInitialized(true);
          }
        } catch (error) {
          console.error('Error initializing Google client:', error);
          throw error;
        }
      });

      console.log('Google Sheets API initialized successfully');
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