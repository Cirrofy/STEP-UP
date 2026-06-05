"use client"

import { useState, useEffect } from "react"
import { Plus, FileText, Link2, Trash2, Loader2, BookOpen, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface Material {
  id: string
  title: string
  description: string | null
  material_type: "file" | "link"
  url: string
  created_at: string
}

export default function TutorMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [tutorProfileId, setTutorProfileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form States
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [materialType, setMaterialType] = useState<"file" | "link">("link")
  const [linkUrl, setLinkUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const supabase = createClient()
  const { toast } = useToast()

  // 1. Ambil data materi saat halaman dimuat
  useEffect(() => {
    const fetchMaterialsData = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Cari internal tutor_id berdasarkan auth user id
        const { data: profileData } = await supabase
          .from('tutor_profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (profileData) {
          setTutorProfileId(profileData.id)
          
          // Ambil daftar materi milik tutor ini
          const { data: materialsData, error } = await supabase
            .from('tutor_materials')
            .select('*')
            .eq('tutor_id', profileData.id)
            .order('created_at', { ascending: false })

          if (error) throw error
          setMaterials(materialsData || [])
        }
      } catch (error: any) {
        console.error("Error fetching materials:", error)
        toast({ variant: "destructive", title: "Gagal memuat materi", description: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMaterialsData()
  }, [supabase, toast])

  // 2. Handle Proses Tambah Materi (Submit Form)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tutorProfileId) return

    setIsSubmitting(true)
    try {
      let finalUrl = ""

      if (materialType === "link") {
        if (!linkUrl) throw new Error("Kolom tautan URL wajib diisi")
        finalUrl = linkUrl
      } else {
        if (!selectedFile) throw new Error("Silakan pilih file terlebih dahulu")

        // Proses upload file ke Supabase Storage Bucket 'tutor-materials'
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${tutorProfileId}/${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('tutor-materials')
          .upload(fileName, selectedFile, { cacheControl: '3600', upsert: true })

        if (uploadError) throw uploadError

        // Dapatkan Public URL untuk file yang berhasil di-upload
        const { data: { publicUrl } } = supabase.storage
          .from('tutor-materials')
          .getPublicUrl(fileName)

        finalUrl = publicUrl
      }

      // Masukkan metadata materi ke dalam tabel database
      const { data: newMaterial, error: insertError } = await supabase
        .from('tutor_materials')
        .insert([{
          tutor_id: tutorProfileId,
          title,
          description: description || null,
          material_type: materialType,
          url: finalUrl
        }])
        .select()
        .single()

      if (insertError) throw insertError

      // Update state local agar langsung muncul di UI
      setMaterials([newMaterial, ...materials])
      toast({ title: "Berhasil!", description: "Materi baru berhasil ditambahkan." })
      
      // Reset form dan tutup modal popup
      closeModal()
    } catch (error: any) {
      toast({ variant: "destructive", title: "Proses gagal", description: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. Handle Hapus Materi
  const handleDelete = async (id: string, url: string, type: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus materi ini?")) return

    try {
      // Jika bertipe file, bersihkan juga file fisiknya yang ada di Supabase Storage
      if (type === "file") {
        const urlParts = url.split('/tutor_materials/')
        if (urlParts.length > 1) {
          const filePath = urlParts[1]
          await supabase.storage.from('tutor-materials').remove([filePath])
        }
      }

      const { error } = await supabase.from('tutor_materials').delete().eq('id', id)
      if (error) throw error

      setMaterials(materials.filter(m => m.id !== id))
      toast({ title: "Terhapus", description: "Materi berhasil dihapus." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Gagal menghapus", description: error.message })
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setTitle("")
    setDescription("")
    setMaterialType("link")
    setLinkUrl("")
    setSelectedFile(null)
  }

  return (
    <main className="px-6 py-8 md:px-12 max-w-5xl mx-auto">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#344675] flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-[#7492c9]" /> Learning Materials
          </h1>
          <p className="text-gray-500 text-sm mt-1">Kelola dokumen materi pembelajaran atau tautan referensi bagi siswa Anda.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-[#7492c9] text-white hover:bg-[#5b78b0] font-bold gap-2">
          <Plus className="w-5 h-5" /> Add Material
        </Button>
      </div>

      {/* Konten Utama */}
      {isLoading ? (
        <div className="text-center text-[#344675] font-bold mt-12 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Memuat daftar materi...
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center text-muted-foreground mt-12 bg-white p-8 rounded-xl border border-dashed border-gray-200">
          Belum ada materi pembelajaran yang di-upload. Klik tombol &quot;Add Material&quot; untuk memulai.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {materials.map((material) => (
            <Card key={material.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 pr-8">
                  <div className="w-10 h-10 rounded-lg bg-[#f4f7f9] flex items-center justify-center text-[#7492c9] shrink-0">
                    {material.material_type === "file" ? <FileText className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#344675] text-lg truncate" title={material.title}>{material.title}</h3>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mt-0.5">
                      {material.material_type}
                    </p>
                    {material.description && (
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{material.description}</p>
                    )}
                    <a 
                      href={material.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-block mt-4 text-sm font-bold text-[#7492c9] hover:underline"
                    >
                      Buka Akses Materi →
                    </a>
                  </div>
                </div>
                {/* Tombol Delete di pojok kanan atas card */}
                <button 
                  onClick={() => handleDelete(material.id, material.url, material.material_type)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-1 transition-colors"
                  title="Hapus Materi"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* POPUP MODAL DIALOG (TAILWIND MODAL OVERLAY) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative border animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-[#f4f7f9]">
              <h2 className="font-bold text-[#344675] text-lg">Tambah Materi Baru</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            {/* Form Konten */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#344675] mb-1">Judul Materi *</label>
                <input 
                  type="text" 
                  required 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Rumus Turunan & Integral Dasar"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#7492c9]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#344675] mb-1">Deskripsi <span className="text-gray-400 font-normal">(Opsional)</span></label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Berikan catatan singkat atau instruksi pengerjaan bagi murid..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#7492c9] resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-[#344675] mb-2">Tipe Materi *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMaterialType("link")}
                    className={cn(
                      "py-2 px-3 border rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                      materialType === "link" ? "border-[#344675] bg-[#d4e1f4] text-[#344675] font-bold" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <Link2 className="w-4 h-4" /> Tautan Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterialType("file")}
                    className={cn(
                      "py-2 px-3 border rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                      materialType === "file" ? "border-[#344675] bg-[#d4e1f4] text-[#344675] font-bold" : "text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    <FileText className="w-4 h-4" /> Upload File
                  </button>
                </div>
              </div>

              {/* Tampilan kondisional berdasarkan tipe materi yang dipilih */}
              {materialType === "link" ? (
                <div key="input-link" className="animate-in fade-in slide-in-from-top-2 duration-150">
                  <label className="block text-sm font-bold text-[#344675] mb-1">URL Link Tautan *</label>
                  <input 
                    type="url" 
                    required={materialType === "link"}
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/... atau https://youtube.com/..."
                    className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#7492c9]"
                  />
                </div>
              ) : (
                <div key="input-file" className="animate-in fade-in slide-in-from-top-2 duration-150">
                  <label className="block text-sm font-bold text-[#344675] mb-1">Pilih File Dokumen *</label>
                  <input 
                    type="file" 
                    required={materialType === "file"}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#f4f7f9] file:text-[#344675] file:cursor-pointer hover:file:bg-[#e4ebf0]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Mendukung file PDF, Office, Gambar dengan batas maksimal ukuran bucket standar.</p>
                </div>
              )}

              {/* Footer Aksi Form */}
              <div className="flex gap-2 justify-end pt-4 border-t mt-6">
                <Button type="button" variant="ghost" onClick={closeModal} disabled={isSubmitting}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#344675] text-white hover:bg-[#233052] font-bold min-w-[100px]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}