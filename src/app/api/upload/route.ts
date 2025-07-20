import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route'
import { DocumentInsert } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request)
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported. Please upload JPG, PNG, or PDF files.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${user.id}/${timestamp}.${fileExtension}`

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('credit-reports')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('credit-reports')
      .getPublicUrl(fileName)

    // Create database record using the insert_document function
    try {
      const { data: documentData, error: dbError } = await supabase
        .rpc('insert_document', {
          p_user_id: user.id,
          p_file_name: file.name,
          p_file_type: file.type,
          p_file_size: file.size,
          p_file_path: fileName,
          p_storage_provider: 'supabase'
        })

      if (dbError) {
        console.error('Database insert error:', dbError)
        return NextResponse.json(
          { error: 'Failed to create database record: ' + dbError.message },
          { status: 400 }
        )
      } else if (documentData) {
        // Track upload analytics
        try {
          await supabase.rpc('track_document_upload', {
            p_user_id: user.id,
            p_document_id: documentData,
            p_file_size: file.size,
            p_processing_method: 'direct_upload'
          })
        } catch (analyticsError) {
          console.error('Analytics tracking failed:', analyticsError)
          // Don't fail the upload for analytics errors
        }
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError)
      return NextResponse.json(
        { error: 'Database operation failed: ' + (dbError as Error).message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
} 