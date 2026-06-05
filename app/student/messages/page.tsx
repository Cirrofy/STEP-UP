"use client"

import { useState, useEffect, Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Send, ImageIcon, Code, Mic, Star, BookOpen, X, FileText, Link2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StudentSubmenu } from "@/components/student/student-submenu"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface UserNode {
  id: string
  full_name: string
  avatar_url: string
}

interface MessageData {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  sender?: UserNode
  receiver?: UserNode
}

interface Contact {
  id: string
  name: string
  image: string
  lastMessage: string
  lastMessageDate: Date
  subtitle?: string
  isBookedTutor: boolean      
  tutorProfileId?: string     
  hasReviewed?: boolean
}

interface Material {
  id: string
  title: string
  description: string | null
  material_type: "file" | "link"
  url: string
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const newContactId = searchParams.get("newContact")

  const [filter, setFilter] = useState<"all" | "unread">("all")
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [allMessages, setAllMessages] = useState<MessageData[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  // Review Modal States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // Materials Modal States
  const [isMaterialsModalOpen, setIsMaterialsModalOpen] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    const fetchChatData = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const myId = session.user.id
        setCurrentUserId(myId)

        const contactsMap = new Map<string, Contact>()
        const bookedTutorsMap = new Map<string, string>() 

        const { data: myReviews } = await supabase
          .from('reviews')
          .select('tutor_id')
          .eq('student_id', myId)
        
        const reviewedTutorsSet = new Set(myReviews?.map(r => r.tutor_id))
        
        // 1. Ambil Tutor dari kelas yang sudah dibooking
        const { data: bookedLessons } = await supabase
          .from('lessons')
          .select(`
            tutor_profiles (
              id,
              subject_taught,
              users ( id, full_name, avatar_url )
            )
          `)
          .eq('student_id', myId)

        bookedLessons?.forEach((lesson: any) => {
          const profileId = lesson.tutor_profiles?.id
          const tutorUser = lesson.tutor_profiles?.users
          if (tutorUser && profileId) {
            bookedTutorsMap.set(tutorUser.id, profileId)
            
            if (!contactsMap.has(tutorUser.id)) {
              contactsMap.set(tutorUser.id, {
                id: tutorUser.id,
                name: tutorUser.full_name || "Tutor",
                image: tutorUser.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
                lastMessage: "No messages yet. Start a conversation!",
                lastMessageDate: new Date(0), 
                subtitle: `Tutor for ${lesson.tutor_profiles.subject_taught}`,
                isBookedTutor: true,
                tutorProfileId: profileId,
                hasReviewed: reviewedTutorsSet.has(profileId)
              })
            }
          }
        })

        // 2. Ambil Riwayat Pesan
        const { data: messagesData } = await supabase
          .from('messages')
          .select(`
            id, sender_id, receiver_id, content, created_at,
            sender:sender_id ( id, full_name, avatar_url ),
            receiver:receiver_id ( id, full_name, avatar_url )
          `)
          .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
          .order('created_at', { ascending: true }) 

        if (messagesData) {
          setAllMessages(messagesData as any[])
          messagesData.forEach((msg: any) => {
            const isMeSender = msg.sender_id === myId
            const otherPersonId = isMeSender ? msg.receiver_id : msg.sender_id
            const otherPersonData = isMeSender ? msg.receiver : msg.sender

            if (!contactsMap.has(otherPersonId)) {
              contactsMap.set(otherPersonId, {
                id: otherPersonId,
                name: otherPersonData?.full_name || "Unknown User",
                image: otherPersonData?.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
                lastMessage: msg.content,
                lastMessageDate: new Date(msg.created_at),
                isBookedTutor: bookedTutorsMap.has(otherPersonId),
                tutorProfileId: bookedTutorsMap.get(otherPersonId)
              })
            } else {
              const existingContact = contactsMap.get(otherPersonId)!
              existingContact.lastMessage = msg.content
              existingContact.lastMessageDate = new Date(msg.created_at)
            }
          })
        }

        // 3. Tangani Parameter URL "newContact" 
        if (newContactId && !contactsMap.has(newContactId)) {
          const { data: newTutorUser } = await supabase.from('users').select('id, full_name, avatar_url').eq('id', newContactId).single()
          if (newTutorUser) {
            contactsMap.set(newTutorUser.id, {
              id: newTutorUser.id,
              name: newTutorUser.full_name,
              image: newTutorUser.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
              lastMessage: "No messages yet. Start a conversation!",
              lastMessageDate: new Date(),
              subtitle: "New Contact",
              isBookedTutor: false 
            })
          }
        }

        const contactsArray = Array.from(contactsMap.values()).sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime())
        setContacts(contactsArray)

        if (newContactId) {
          setSelectedContactId(newContactId)
        } else if (contactsArray.length > 0 && !selectedContactId) {
          setSelectedContactId(contactsArray[0].id)
        }

      } catch (error: any) {
        console.error("Error fetching messages:", error)
        toast({ variant: "destructive", title: "Error", description: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchChatData()
  }, [supabase, toast, newContactId])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !selectedContactId) return

    const tempMessage = newMessage
    setNewMessage("") 
    setIsSending(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: currentUserId, receiver_id: selectedContactId, content: tempMessage })
        .select(`
          id, sender_id, receiver_id, content, created_at,
          sender:sender_id ( id, full_name, avatar_url ),
          receiver:receiver_id ( id, full_name, avatar_url )
        `)
        .single()

      if (error) throw error

      if (data) {
        setAllMessages((prev) => [...prev, data as any]) 
        setContacts((prevContacts) => {
          return prevContacts.map(c => 
            c.id === selectedContactId 
              ? { ...c, lastMessage: tempMessage, lastMessageDate: new Date() } 
              : c
          ).sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime())
        })
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to send", description: error.message })
      setNewMessage(tempMessage) 
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmitReview = async () => {
    const selectedContact = contacts.find(c => c.id === selectedContactId)
    if (!currentUserId || !selectedContact?.tutorProfileId) return
    
    if (!reviewText.trim()) {
      toast({ variant: "destructive", title: "Wait!", description: "Please write a comment for your review." })
      return
    }

    setIsSubmittingReview(true)

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          student_id: currentUserId,
          tutor_id: selectedContact.tutorProfileId,
          rating: reviewRating,
          comment: reviewText
        })

      if (error) throw error

      toast({ title: "Review Submitted!", description: `Thank you for reviewing ${selectedContact.name}.` })
      setIsReviewModalOpen(false)
      setReviewText("")
      setReviewRating(5)

      // Update local state untuk menandai tutor ini sudah di-review
      setContacts((prev) => prev.map(c => c.id === selectedContactId ? { ...c, hasReviewed: true } : c))

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error submitting review", description: error.message })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  // Aksi Membuka Modal Materials
  const handleOpenMaterials = async () => {
    const selectedContact = contacts.find(c => c.id === selectedContactId)
    if (!selectedContact?.tutorProfileId) return

    setIsMaterialsModalOpen(true)
    setIsLoadingMaterials(true)
    try {
      const { data, error } = await supabase
        .from('tutor_materials')
        .select('id, title, description, material_type, url')
        .eq('tutor_id', selectedContact.tutorProfileId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMaterials(data || [])
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Gagal memuat materi pembelajaran." })
    } finally {
      setIsLoadingMaterials(false)
    }
  }

  const selectedContact = contacts.find(c => c.id === selectedContactId)
  
  const currentChatMessages = allMessages
    .filter(msg => 
      (msg.sender_id === currentUserId && msg.receiver_id === selectedContactId) ||
      (msg.sender_id === selectedContactId && msg.receiver_id === currentUserId)
    )

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading Messages...</div>

  return (
    <>
      <StudentSubmenu />
      <main className="flex h-[calc(100vh-140px)]">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setFilter("all")}
              className={cn("flex-1 py-3 text-center font-bold transition-colors border-b-2", filter === "all" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent hover:text-gray-600")}
            >All</button>
            <button
              onClick={() => setFilter("unread")}
              className={cn("flex-1 py-3 text-center font-bold transition-colors border-b-2", filter === "unread" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent hover:text-gray-600")}
            >Unread</button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No conversations yet. Search for a tutor!</div>
            ) : (
              contacts.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedContactId(conv.id)}
                  className={cn("w-full p-4 flex gap-3 text-left transition-colors border-b border-gray-50", selectedContactId === conv.id ? "bg-[#e8f1f8]" : "hover:bg-gray-50")}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border">
                    <Image src={conv.image} alt={conv.name} width={48} height={48} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#344675] truncate">{conv.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{conv.lastMessage}</p>
                    {conv.subtitle && <p className="text-[10px] font-bold text-[#7492c9] mt-1 uppercase tracking-wider">{conv.subtitle}</p>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#f4f7f9]/50">
          {selectedContact ? (
            <>
              <div className="p-4 border-b border-gray-200 bg-white">
                <h2 className="text-lg font-bold text-[#344675]">{selectedContact.name}</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
                {currentChatMessages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId
                  const avatar = isMe ? msg.sender?.avatar_url : msg.sender?.avatar_url
                  const senderName = isMe ? "You" : msg.sender?.full_name

                  return (
                    <div key={msg.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border bg-white">
                        <Image src={avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop"} alt={senderName || ""} width={40} height={40} className="object-cover w-full h-full" />
                      </div>
                      <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                        <p className="font-semibold text-[#344675] text-xs mb-1 ml-1 mr-1">{senderName}</p>
                        <div className={cn("p-3 rounded-2xl", isMe ? "bg-[#7492c9] text-white rounded-tr-sm" : "bg-white border border-gray-200 text-[#344675] rounded-tl-sm")}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        <span className="text-[10px] text-gray-400 mt-1 mx-1">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Message Input */}
              <div className="p-4 bg-white border-t border-gray-200">
                <Card className="shadow-sm border-gray-200">
                  <CardContent className="p-2 flex items-center gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                      }}
                      placeholder="Type Your Message Here..."
                      className="flex-1 resize-none bg-transparent text-[#344675] placeholder:text-gray-400 focus:outline-none text-sm px-3 py-2 h-[40px]"
                      rows={1}
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="w-10 h-10 rounded-full bg-[#7492c9] hover:bg-[#5b78b0] flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4 text-white -ml-0.5" />
                    </button>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">Select a tutor to start messaging</div>
          )}
        </div>

        {/* Tutor Details Panel (Right Sidebar) */}
        {selectedContact && (
          <div className="w-80 border-l border-gray-200 p-6 bg-white flex flex-col items-center">
            <h3 className="font-bold text-[#344675] text-lg mb-8 w-full border-b pb-4">Details</h3>
            <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-[#f4f7f9] shadow-sm">
              <Image src={selectedContact.image} alt={selectedContact.name} width={128} height={128} className="object-cover w-full h-full" />
            </div>
            <h2 className="text-xl font-bold text-[#344675] mb-8 text-center">{selectedContact.name}</h2>
            
            <div className="w-full space-y-3">
              <Link href={`/student/find-tutors/${selectedContact.id}`}>
                <Button className="w-full bg-[#7492c9] hover:bg-[#5b78b0] text-white font-bold rounded-full h-12 mb-3">
                  Add Extra Lessons
                </Button>
              </Link>

              {/* Tampilkan Tombol View Materials & Review HANYA JIKA Tutor Sudah di-booking */}
              {selectedContact.isBookedTutor && (
                <>
                  {/* TOMBOL BARU: View Materials */}
                  <Button 
                    variant="outline" 
                    onClick={handleOpenMaterials}
                    className="w-full border-2 border-[#344675] text-[#344675] hover:bg-[#d4e1f4] font-bold rounded-full h-12 flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" /> View Materials
                  </Button>

                  <Button 
                    variant={selectedContact.hasReviewed ? "ghost" : "outline"}
                    onClick={() => !selectedContact.hasReviewed && setIsReviewModalOpen(true)}
                    disabled={selectedContact.hasReviewed}
                    className={cn(
                      "w-full font-bold rounded-full h-12 flex items-center justify-center gap-2",
                      selectedContact.hasReviewed 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed border-none" 
                        : "border-2 border-[#7492c9] text-[#7492c9] hover:bg-[#e8f1f8]"
                    )}
                  >
                    <Star className={cn("w-4 h-4", selectedContact.hasReviewed ? "text-gray-300" : "fill-current")} />
                    {selectedContact.hasReviewed ? "Review Submitted" : "Post Review"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- POPUP 1: MATERIALS MODAL --- */}
      {isMaterialsModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <Card className="w-full max-w-lg shadow-2xl rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b bg-[#f4f7f9] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[#344675] text-lg">Materi Pembelajaran</h3>
                <p className="text-xs text-gray-500 mt-0.5">Disediakan oleh {selectedContact.name}</p>
              </div>
              <button onClick={() => setIsMaterialsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-6 max-h-[400px] overflow-y-auto space-y-3">
              {isLoadingMaterials ? (
                <div className="py-8 text-center text-gray-500 text-sm font-semibold flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Mengambil dokumen materi...
                </div>
              ) : materials.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed">
                  Tutor belum mengunggah berkas materi untuk kelas ini.
                </div>
              ) : (
                materials.map((item) => (
                  <div key={item.id} className="p-4 border rounded-xl bg-white flex items-start gap-4 hover:border-[#7492c9] transition-colors group">
                    <div className="w-9 h-9 bg-[#f4f7f9] text-[#7492c9] rounded-lg flex items-center justify-center shrink-0">
                      {item.material_type === "file" ? <FileText className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#344675] text-sm truncate">{item.title}</h4>
                      {item.description && <p className="text-xs text-gray-400 line-clamp-2 mt-1 leading-normal">{item.description}</p>}
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block text-xs font-bold text-[#7492c9] hover:underline mt-2"
                      >
                        Unduh / Buka Tautan →
                      </a>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- POPUP 2: REVIEW MODAL --- */}
      {isReviewModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <Card className="w-full max-w-md shadow-2xl rounded-xl border border-gray-100 overflow-hidden bg-white">
            <div className="px-6 py-4 border-b bg-[#f4f7f9] flex items-center justify-between">
              <h3 className="font-bold text-[#344675] text-lg">Berikan Review</h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm font-semibold text-gray-600 mb-1">Bagaimana pengalaman belajar Anda bersama</p>
                <p className="font-bold text-[#7492c9] text-base">{selectedContact.name}?</p>
              </div>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-10 h-10 cursor-pointer transition-transform active:scale-95", 
                      star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 hover:text-yellow-200"
                    )}
                    onClick={() => setReviewRating(star)}
                  />
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Tulis ulasan Anda di sini... (Contoh: Penjelasan kakak sangat mudah dipahami!)"
                className="w-full h-32 p-3 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#7492c9] text-[#344675] mb-6"
              />

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button variant="ghost" onClick={() => setIsReviewModalOpen(false)} disabled={isSubmittingReview}>
                  Batal
                </Button>
                <Button 
                  onClick={handleSubmitReview} 
                  disabled={isSubmittingReview || !reviewText.trim()} 
                  className="bg-[#7492c9] text-white hover:bg-[#5b78b0] font-bold min-w-[120px]"
                >
                  {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Review"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">
        Loading Messages...
      </div>
    }>
      <MessagesContent />
    </Suspense>
  )
}