export interface EdgeFunctionLogs {
  Row: {
    id: string;
    timestamp: string | null;
    function_name: string;
    status: string;
    message: string;
  };
  Insert: {
    id?: string;
    timestamp?: string | null;
    function_name: string;
    status: string;
    message: string;
  };
  Update: {
    id?: string;
    timestamp?: string | null;
    function_name?: string;
    status?: string;
    message?: string;
  };
}