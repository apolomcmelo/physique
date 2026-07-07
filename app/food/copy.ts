export const FOOD_IMPORT_ACTION_LABEL = 'Importar rótulo';
export const FOOD_IMPORT_HINT =
    'Use a câmera para importar dados da tabela nutricional ou preencha manualmente.';

export function getFoodScanPrimaryActionLabel(loading: boolean): string {
    return loading ? 'Processando imagem...' : 'Importar tabela com a câmera';
}

export const FOOD_SCAN_RECOGNIZED_TEXT_LABEL = 'Texto identificado na imagem';
