"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Send, ImageIcon, Code, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

// --- Interfaces ---
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
}

export default function TutorMessagesPage() {
  const [filter, setFilter] = useState<"all" | "unread">("all")
  
  // Data States
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [allMessages, setAllMessages] = useState<MessageData[]>([])
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)

  const supabase = createClient()
  const { toast } = useToast()

  // 1. Fetch Initial Data
  useEffect(() => {
    const fetchChatData = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        
        const myId = session.user.id
        setCurrentUserId(myId)

        const contactsMap = new Map<string, Contact>()

        // A. Ambil Riwayat Pesan (Orang yang sudah pernah chat)
        const { data: messagesData, error } = await supabase
          .from('messages')
          .select(`
            id, sender_id, receiver_id, content, created_at,
            sender:sender_id ( id, full_name, avatar_url ),
            receiver:receiver_id ( id, full_name, avatar_url )
          `)
          .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
          .order('created_at', { ascending: false })

        if (error) throw error

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
                lastMessageDate: new Date(msg.created_at)
              })
            }
          })
        }

        // B. Ambil Student dari kelas yang sudah dibooking (Yang belum pernah chat)
        const { data: profile } = await supabase.from('tutor_profiles').select('id').eq('user_id', myId).single()
        
        if (profile) {
          const { data: bookedLessons } = await supabase
            .from('lessons')
            .select('users ( id, full_name, avatar_url )')
            .eq('tutor_id', profile.id)

          bookedLessons?.forEach((lesson: any) => {
            const studentUser = lesson.users
            // Jika student ini belum ada di contactsMap (belum pernah chat), tambahkan!
            if (studentUser && !contactsMap.has(studentUser.id)) {
              contactsMap.set(studentUser.id, {
                id: studentUser.id,
                name: studentUser.full_name || "Student",
                image: studentUser.avatar_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop",
                lastMessage: "No messages yet. Say hi!",
                lastMessageDate: new Date(0) // Turunkan ke urutan paling bawah
              })
            }
          })
        }

        // Convert ke Array dan Urutkan
        const contactsArray = Array.from(contactsMap.values()).sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime())
        setContacts(contactsArray)
        
        // Otomatis pilih kontak pertama jika ada
        if (contactsArray.length > 0 && !selectedContactId) {
          setSelectedContactId(contactsArray[0].id)
        }

      } catch (error: any) {
        console.error("Error fetching messages:", error)
        toast({ variant: "destructive", title: "Error loading messages", description: error.message })
      } finally {
        setIsLoading(false)
      }
    }

    fetchChatData()
  }, [supabase, toast, selectedContactId])

  // 2. Kirim Pesan
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !selectedContactId) return

    const tempMessage = newMessage
    setNewMessage("") 
    setIsSending(true)

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          receiver_id: selectedContactId,
          content: tempMessage
        })
        .select(`
          id, sender_id, receiver_id, content, created_at,
          sender:sender_id ( id, full_name, avatar_url ),
          receiver:receiver_id ( id, full_name, avatar_url )
        `)
        .single()

      if (error) throw error

      if (data) {
        setAllMessages((prev) => [data as any, ...prev])
        
        setContacts((prevContacts) => {
          return prevContacts.map(c => 
            c.id === selectedContactId 
              ? { ...c, lastMessage: tempMessage, lastMessageDate: new Date() } 
              : c
          ).sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime())
        })
      }

    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to send message", description: error.message })
      setNewMessage(tempMessage)
    } finally {
      setIsSending(false)
    }
  }

  // --- FILTER & DERIVATIONS ---
  const selectedContact = contacts.find(c => c.id === selectedContactId)

  const currentChatMessages = allMessages
    .filter(msg => 
      (msg.sender_id === currentUserId && msg.receiver_id === selectedContactId) ||
      (msg.sender_id === selectedContactId && msg.receiver_id === currentUserId)
    )
    .reverse()

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-[#344675] font-bold">Loading Messages...</div>

  return (
    <main className="flex h-[calc(100vh-130px)]">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        {/* Filters */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "flex-1 py-3 text-center font-bold transition-colors border-b-2",
              filter === "all" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent hover:text-gray-600"
            )}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "flex-1 py-3 text-center font-bold transition-colors border-b-2",
              filter === "unread" ? "text-[#7492c9] border-[#7492c9]" : "text-gray-400 border-transparent hover:text-gray-600"
            )}
          >
            Unread
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No conversations yet.</div>
          ) : (
            contacts.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedContactId(conv.id)}
                className={cn(
                  "w-full p-4 flex items-center gap-3 transition-colors text-left border-b border-gray-50",
                  selectedContactId === conv.id ? "bg-[#e8f1f8]" : "hover:bg-gray-50"
                )}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border">
                  <Image src={conv.image} alt={conv.name} width={48} height={48} className="object-cover w-full h-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#344675] truncate">{conv.name}</h3>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{conv.lastMessage}</p>
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
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="font-bold text-[#344675] text-lg">{selectedContact.name}</h2>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {currentChatMessages.map((msg) => {
                const isMe = msg.sender_id === currentUserId
                const avatar = isMe ? msg.sender?.avatar_url : msg.sender?.avatar_url
                const senderName = isMe ? "You" : msg.sender?.full_name

                return (
                  <div key={msg.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border bg-white">
                      <Image
                        src={avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop"}
                        alt={senderName || "User"}
                        width={40} height={40} className="object-cover w-full h-full"
                      />
                    </div>
                    <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                      <p className="font-semibold text-[#344675] text-xs mb-1 ml-1 mr-1">{senderName}</p>
                      <div className={cn(
                        "p-3 rounded-2xl",
                        isMe ? "bg-[#7492c9] text-white rounded-tr-sm" : "bg-white border border-gray-200 text-[#344675] rounded-tl-sm"
                      )}>
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
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {/* Student Details Sidebar */}
      {selectedContact && (
        <div className="w-80 border-l border-gray-200 p-6 bg-white flex flex-col items-center">
          <h3 className="font-bold text-[#344675] text-lg mb-8 w-full border-b pb-4">Details</h3>
          <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-[#f4f7f9] shadow-sm">
            <Image src={selectedContact.image} alt={selectedContact.name} width={128} height={128} className="object-cover w-full h-full" />
          </div>
          <h2 className="text-2xl font-bold text-[#344675] mb-8">{selectedContact.name}</h2>
          
          <Button variant="outline" className="w-full border-2 border-[#344675] text-[#344675] rounded-full hover:bg-[#d4e1f4] font-bold h-12">
            Enter Classroom
          </Button>
        </div>
      )}
    </main>
  )
}