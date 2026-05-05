"use client"

import { useState, useEffect, Suspense } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Send, ImageIcon, Code, Mic, Star } from "lucide-react"
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
  isBookedTutor: boolean      // Penanda apakah ini tutor yang sudah di-booking
  tutorProfileId?: string     // Menyimpan ID Profile Tutor (untuk tabel review)
}

// 1. Ubah nama fungsi utama jadi MessagesContent dan hapus export default
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
        const bookedTutorsMap = new Map<string, string>() // Map untuk user_id -> tutor_profile_id

        // 1. Ambil Tutor dari kelas yang sudah dibooking TERLEBIH DAHULU
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
                lastMessageDate: new Date(0), // Set 1970 agar ke paling bawah
                subtitle: `Tutor for ${lesson.tutor_profiles.subject_taught}`,
                isBookedTutor: true,
                tutorProfileId: profileId
              })
            }
          }
        })

        // 2. Ambil Riwayat Pesan (Menumpuk data di atas Tutor yang sudah di map)
        const { data: messagesData } = await supabase
          .from('messages')
          .select(`
            id, sender_id, receiver_id, content, created_at,
            sender:sender_id ( id, full_name, avatar_url ),
            receiver:receiver_id ( id, full_name, avatar_url )
          `)
          .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
          .order('created_at', { ascending: true }) // Gunakan ascending agar pesan TERBARU menimpa pesan LAMA

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
              // Jika sudah ada (entah dari pesan lama atau dari booked lesson), PERBARUI last message
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
              isBookedTutor: false // Karena tidak ada di tabel lesson, maka false
            })
          }
        }

        // Urutkan berdasarkan waktu pesan terbaru
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
        setAllMessages((prev) => [...prev, data as any]) // Tambahkan ke paling akhir
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

    } catch (error: any) {
      toast({ variant: "destructive", title: "Error submitting review", description: error.message })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const selectedContact = contacts.find(c => c.id === selectedContactId)
  
  // Urutkan pesan dari yang lama ke yang terbaru
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

              {/* flex-col-reverse dihapus, pesan lama di atas, turun ke bawah (wajar) */}
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
            <h2 className="text-xl font-bold text-[#344675] mb-8">{selectedContact.name}</h2>
            
            <div className="w-full space-y-3">
              <Button className="w-full bg-[#7492c9] hover:bg-[#5b78b0] text-white font-bold rounded-full h-12">
                Add Extra Lessons
              </Button>
              <Button variant="outline" className="w-full border-2 border-[#344675] text-[#344675] hover:bg-[#d4e1f4] font-bold rounded-full h-12">
                Enter Classroom
              </Button>

              {/* Tampilkan Tombol Review HANYA JIKA Tutor Sudah di-booking */}
              {selectedContact.isBookedTutor && (
                <Button 
                  variant="outline" 
                  onClick={() => setIsReviewModalOpen(true)}
                  className="w-full border-2 border-[#7492c9] text-[#7492c9] hover:bg-[#e8f1f8] font-bold rounded-full h-12"
                >
                  Post Review
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- REVIEW MODAL POP-UP --- */}
      {isReviewModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4 shadow-xl">
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[#344675] mb-2">Review {selectedContact.name}</h3>
                <p className="text-sm text-gray-500">How was your learning experience?</p>
              </div>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-10 h-10 cursor-pointer transition-colors", 
                      star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-200 hover:text-yellow-200"
                    )}
                    onClick={() => setReviewRating(star)}
                  />
                ))}
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review here... (e.g., Great tutor, explains clearly!)"
                className="w-full h-32 p-3 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#7492c9] text-[#344675] mb-6"
              />

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsReviewModalOpen(false)} className="font-bold border-gray-300">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitReview} 
                  disabled={isSubmittingReview || !reviewText.trim()} 
                  className="bg-[#7492c9] text-white hover:bg-[#5b78b0] font-bold"
                >
                  {isSubmittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// 2. Buat komponen export default baru sebagai wrapper Suspense
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