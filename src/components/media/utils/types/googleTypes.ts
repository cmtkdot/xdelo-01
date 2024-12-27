declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: { callback: () => void; onerror: () => void }) => void;
      client: {
        init: (config: {
          clientId: string;
          scope: string;
          discoveryDocs: string[];
        }) => Promise<void>;
        sheets: {
          spreadsheets: {
            get: (params: { spreadsheetId: string }) => Promise<any>;
            values: {
              get: (params: { spreadsheetId: string; range: string }) => Promise<any>;
              update: (params: {
                spreadsheetId: string;
                range: string;
                valueInputOption: string;
                resource: { values: any[][] };
              }) => Promise<any>;
              clear: (params: {
                spreadsheetId: string;
                range: string;
              }) => Promise<any>;
            };
          };
        };
      };
      auth2: {
        getAuthInstance: () => {
          isSignedIn: {
            get: () => boolean;
          };
          signIn: () => Promise<void>;
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export {};