import * as glide from "@glideapps/tables";
import { GlideTableConfig, GlideTableOperation } from '../../../src/integrations/glide/types';

export async function executeTableOperation(
  config: GlideTableConfig,
  operation: GlideTableOperation
) {
  const table = glide.table(config);

  try {
    switch (operation.type) {
      case 'get':
        return await table.get();
      
      case 'add':
        if (!operation.data) throw new Error('Data required for add operation');
        return await table.add(operation.data);
      
      case 'update':
        if (!operation.rowId || !operation.data) {
          throw new Error('Row ID and data required for update operation');
        }
        return await table.update(operation.rowId, operation.data);
      
      case 'delete':
        if (!operation.rowId) throw new Error('Row ID required for delete operation');
        return await table.delete(operation.rowId);
      
      default:
        throw new Error('Invalid operation type');
    }
  } catch (error) {
    console.error(`Error executing ${operation.type} operation:`, error);
    throw error;
  }
}