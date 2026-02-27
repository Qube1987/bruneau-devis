import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Image as ImageIcon, Video, Search, Filter, RotateCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMediaInfo } from '../lib/media-utils';

interface MediaItem {
  id: string;
  file_path: string;
  thumbnail_path?: string;
  file_hash: string;
  file_size: number;
  original_filename: string;
  media_type: 'image' | 'video';
  created_at: string;
}

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 300 * 1024 * 1024;

export const MediaLibrary: React.FC = () => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMedia();
  }, []);

  useEffect(() => {
    filterMedia();
  }, [searchTerm, filterType, mediaItems]);

  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('media_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaItems(data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      alert('Erreur lors du chargement de la bibliothèque');
    } finally {
      setLoading(false);
    }
  };

  const filterMedia = () => {
    let filtered = mediaItems;

    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.media_type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        alert(`Le fichier "${file.name}" n'est ni une image ni une vidéo.`);
        return;
      }

      if (isImage && file.size > MAX_IMAGE_SIZE) {
        alert(`L'image "${file.name}" est trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 20 MB`);
        return;
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        alert(`La vidéo "${file.name}" est trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 300 MB`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress({ current: 0, total: fileArray.length, fileName: '' });

    let uploadedCount = 0;
    let skippedCount = 0;

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgress({ current: i + 1, total: fileArray.length, fileName: `Analyse de ${file.name}...` });

        const isVideo = file.type.startsWith('video/');
        const mediaInfo = await getMediaInfo(file);

        const { data: existing } = await supabase
          .from('media_library')
          .select('id')
          .eq('file_hash', mediaInfo.hash)
          .maybeSingle();

        if (existing) {
          console.log(`Fichier déjà existant: ${file.name}`);
          skippedCount++;
          continue;
        }

        setUploadProgress({ current: i + 1, total: fileArray.length, fileName: `Upload de ${file.name}...` });

        const fileExt = file.name.split('.').pop();
        const fileName = `media/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Erreur lors de l'upload de "${file.name}": ${uploadError.message}`);
        }

        let thumbnailPath: string | null = null;

        // Générer une miniature pour les images
        if (!isVideo) {
          try {
            setUploadProgress({ current: i + 1, total: fileArray.length, fileName: `Génération miniature de ${file.name}...` });

            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`;
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                bucket: 'products',
                filePath: filePath,
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 98
              }),
            });

            if (response.ok) {
              const result = await response.json();
              thumbnailPath = result.thumbnailPath;
            } else {
              console.warn('Failed to generate thumbnail, continuing without it');
            }
          } catch (thumbError) {
            console.warn('Thumbnail generation error:', thumbError);
          }
        }

        const { data: newMedia, error: insertError } = await supabase
          .from('media_library')
          .insert({
            file_path: filePath,
            thumbnail_path: thumbnailPath,
            file_hash: mediaInfo.hash,
            file_size: mediaInfo.size,
            original_filename: mediaInfo.originalFilename,
            media_type: isVideo ? 'video' : 'image'
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          await supabase.storage.from('products').remove([filePath]);
          if (thumbnailPath) {
            await supabase.storage.from('products').remove([thumbnailPath]);
          }
          throw new Error(`Erreur lors de l'enregistrement de "${file.name}": ${insertError.message}`);
        }

        setMediaItems(prev => [newMedia, ...prev]);
        uploadedCount++;
      }

      let message = 'Importation terminée !\n\n';
      if (uploadedCount > 0) {
        message += `${uploadedCount} fichier(s) ajouté(s)\n`;
      }
      if (skippedCount > 0) {
        message += `${skippedCount} fichier(s) déjà existant(s)`;
      }
      alert(message);
    } catch (error: any) {
      console.error('Error uploading files:', error);
      alert(error.message || 'Erreur lors de l\'upload');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (media: MediaItem) => {
    const { data: usageCount } = await supabase
      .from('product_media')
      .select('id', { count: 'exact', head: true })
      .eq('media_library_id', media.id);

    if (usageCount && usageCount > 0) {
      if (!confirm(`Ce média est utilisé par ${usageCount} produit(s). Êtes-vous sûr de vouloir le supprimer ?`)) {
        return;
      }
    }

    try {
      const { error: deleteError } = await supabase
        .from('media_library')
        .delete()
        .eq('id', media.id);

      if (deleteError) throw deleteError;

      await supabase.storage.from('products').remove([media.file_path]);

      // Supprimer aussi la miniature si elle existe
      if (media.thumbnail_path) {
        await supabase.storage.from('products').remove([media.thumbnail_path]);
      }

      setMediaItems(prev => prev.filter(m => m.id !== media.id));
      alert('Média supprimé avec succès !');
    } catch (error) {
      console.error('Error deleting media:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleRegenerateThumbnail = async (media: MediaItem) => {
    if (media.media_type !== 'image') return;

    setRegeneratingIds(prev => new Set(prev).add(media.id));
    try {
      if (media.thumbnail_path) {
        await supabase.storage.from('products').remove([media.thumbnail_path]);
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-thumbnail`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          bucket: 'products',
          filePath: media.file_path,
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 98
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération de la miniature');
      }

      const result = await response.json();

      const { error: updateError } = await supabase
        .from('media_library')
        .update({ thumbnail_path: result.thumbnailPath })
        .eq('id', media.id);

      if (updateError) throw updateError;

      setMediaItems(prev => prev.map(m =>
        m.id === media.id ? { ...m, thumbnail_path: result.thumbnailPath } : m
      ));

      alert('Miniature régénérée avec succès !');
    } catch (error) {
      console.error('Error regenerating thumbnail:', error);
      alert('Erreur lors de la régénération de la miniature');
    } finally {
      setRegeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(media.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Chargement de la bibliothèque...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Bibliothèque de médias</h2>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center gap-4">
            <label className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un fichier..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous</option>
                <option value="image">Images</option>
                <option value="video">Vidéos</option>
              </select>
            </div>

            <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Uploader
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {uploading && uploadProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-blue-700">
                {uploadProgress.fileName}
              </span>
              <span className="text-sm text-blue-700">
                {uploadProgress.current} / {uploadProgress.total}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600">
          {filteredItems.length} média(s) - {(filteredItems.reduce((sum, item) => sum + item.file_size, 0) / 1024 / 1024).toFixed(1)} MB
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((media) => (
          <div key={media.id} className="bg-white rounded-lg shadow overflow-hidden group relative">
            <div className="aspect-video bg-gray-100 relative">
              {media.media_type === 'image' ? (
                <img
                  src={getPublicUrl(media.file_path)}
                  alt={media.original_filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <Video className="w-12 h-12 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                {media.media_type === 'image' && (
                  <button
                    onClick={() => handleRegenerateThumbnail(media)}
                    disabled={regeneratingIds.has(media.id)}
                    className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-opacity disabled:opacity-50"
                    title="Régénérer la miniature en haute qualité"
                  >
                    <RotateCw className={`w-5 h-5 ${regeneratingIds.has(media.id) ? 'animate-spin' : ''}`} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(media)}
                  className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-opacity"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2">
              <div className="flex items-center gap-1 mb-1">
                {media.media_type === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <Video className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xs text-gray-500">
                  {(media.file_size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
              <p className="text-sm text-gray-700 truncate" title={media.original_filename}>
                {media.original_filename}
              </p>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {searchTerm || filterType !== 'all'
            ? 'Aucun média ne correspond à votre recherche'
            : 'Aucun média dans la bibliothèque. Commencez par uploader des fichiers !'
          }
        </div>
      )}
    </div>
  );
};
