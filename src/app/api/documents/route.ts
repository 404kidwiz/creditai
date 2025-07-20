import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route'

export async function POST(request: NextRequest) {
  try {
    const { userId, documentType, fileUrl, fileName, fileSize, ocrText, aiAnalysis } = await request.json()

    if (!userId || !documentType || !fileUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Use the correct function with all parameters
    const { data, error } = await supabase.rpc('insert_document_full', {
      p_user_id: userId,
      p_document_type: documentType,
      p_file_url: fileUrl,
      p_file_name: fileName || 'unknown',
      p_file_size: fileSize || 0,
      p_ocr_text: ocrText || null,
      p_ai_analysis: aiAnalysis || null
    })

    if (error) {
      console.error('Database insert failed:', error)
      return NextResponse.json(
        { error: 'Failed to save document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, documentId: data })
  } catch (error) {
    console.error('Error saving document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}