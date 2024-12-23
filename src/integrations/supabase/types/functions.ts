import type { Database } from './base';

export type Functions<
  PublicFunctionNameOrOptions extends
    | keyof Database['public']['Functions']
    | { schema: keyof Database },
  FunctionName extends PublicFunctionNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicFunctionNameOrOptions['schema']]['Functions']
    : never = never,
> = PublicFunctionNameOrOptions extends { schema: keyof Database }
  ? Database[PublicFunctionNameOrOptions['schema']]['Functions'][FunctionName]
  : PublicFunctionNameOrOptions extends keyof Database['public']['Functions']
  ? Database['public']['Functions'][PublicFunctionNameOrOptions]
  : never;