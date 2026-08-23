import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Platform } from 'react-native';

/**
 * React Native's fetch().blob().arrayBuffer() does not reliably read local file:// URIs
 * (it can yield an empty/corrupted buffer), which Supabase Storage rejects with 400.
 * Reading via expo-file-system as base64 and decoding is the reliable path on native.
 */
export async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
    if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.arrayBuffer();
    }

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return decode(base64);
}
