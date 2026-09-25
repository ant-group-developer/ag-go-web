import { App as AntApp } from 'antd';
import { useTranslation } from 'react-i18next';
import type { SetFolderGrantInput } from '../types/set-folder-grant-input.type';
import { useRemoveFolderGrant, useSetFolderGrant } from './use-folder-access';

/** Grant mutations with success/error toasts, shared by the folder drawer and the user page. */
export function useGrantActions() {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const setGrant = useSetFolderGrant();
  const removeGrant = useRemoveFolderGrant();

  const showError = (error: unknown) =>
    void message.error(error instanceof Error ? error.message : t('folderAccess.saveFailed'));

  const save = async (
    input: SetFolderGrantInput,
    successMessage = t('folderAccess.saveSuccess'),
  ) => {
    try {
      await setGrant.mutateAsync(input);
      void message.success(successMessage);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  };

  const remove = async (folderId: string, principalId: string) => {
    try {
      await removeGrant.mutateAsync({ folderId, principalId });
      void message.success(t('folderAccess.removeSuccess'));
    } catch (error) {
      showError(error);
    }
  };

  const isSaving = (folderId: string, principalId: string) =>
    setGrant.isPending &&
    setGrant.variables?.folderId === folderId &&
    setGrant.variables.principalId === principalId;

  const isRemoving = (folderId: string, principalId: string) =>
    removeGrant.isPending &&
    removeGrant.variables?.folderId === folderId &&
    removeGrant.variables.principalId === principalId;

  return { save, remove, isSaving, isRemoving, isSubmitting: setGrant.isPending };
}
