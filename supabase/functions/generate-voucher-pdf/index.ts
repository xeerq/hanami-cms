import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    if (req.method !== 'POST') {
      throw new Error('Only POST method allowed')
    }

    const { voucherId } = await req.json()
    
    if (!voucherId) {
      throw new Error('Voucher ID is required')
    }

    console.log(`Generating PDF for voucher: ${voucherId}`)

    // Fetch voucher data with related information
    const { data: voucher, error: voucherError } = await supabaseClient
      .from('vouchers')
      .select(`
        *,
        services(name, description),
        profiles(first_name, last_name)
      `)
      .eq('id', voucherId)
      .single()

    if (voucherError) {
      console.error('Error fetching voucher:', voucherError)
      throw new Error('Voucher not found')
    }

    console.log('Voucher data:', voucher)

    // Generate HTML content for the voucher
    const voucherOwner = voucher.profiles?.first_name && voucher.profiles?.last_name 
      ? `${voucher.profiles.first_name} ${voucher.profiles.last_name}`
      : voucher.purchaser_name || 'Właściciel bonu'

    const serviceInfo = voucher.services?.name || 'Wszystkie usługi'
    const voucherValue = voucher.voucher_type === 'single' 
      ? `${voucher.original_value} zł`
      : `${voucher.original_sessions} sesji`

    const expiryDate = voucher.expires_at 
      ? new Date(voucher.expires_at).toLocaleDateString('pl-PL')
      : 'Bezterminowy'

    // Create HTML template for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4;
                margin: 20mm;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
            }
            
            .voucher-container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
                border: 3px solid #e91e63;
            }
            
            .voucher-header {
                background: linear-gradient(135deg, #e91e63 0%, #f06292 100%);
                color: white;
                padding: 30px;
                text-align: center;
                position: relative;
            }
            
            .voucher-header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="2" fill="white" opacity="0.1"/></svg>');
                background-size: 30px 30px;
            }
            
            .voucher-title {
                font-size: 36px;
                font-weight: bold;
                margin: 0;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                position: relative;
                z-index: 1;
            }
            
            .voucher-subtitle {
                font-size: 18px;
                margin: 10px 0 0 0;
                opacity: 0.9;
                position: relative;
                z-index: 1;
            }
            
            .voucher-body {
                padding: 40px;
                text-align: center;
            }
            
            .voucher-code {
                background: #f8f9fa;
                border: 2px dashed #e91e63;
                border-radius: 15px;
                padding: 20px;
                margin: 20px 0;
                font-family: 'Courier New', monospace;
                font-size: 24px;
                font-weight: bold;
                color: #e91e63;
                letter-spacing: 3px;
            }
            
            .voucher-details {
                margin: 30px 0;
            }
            
            .detail-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 0;
                border-bottom: 1px solid #eee;
                font-size: 16px;
            }
            
            .detail-row:last-child {
                border-bottom: none;
            }
            
            .detail-label {
                font-weight: bold;
                color: #666;
            }
            
            .detail-value {
                color: #333;
                font-weight: 500;
            }
            
            .value-highlight {
                background: linear-gradient(135deg, #e91e63 0%, #f06292 100%);
                color: white;
                padding: 8px 16px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 18px;
            }
            
            .voucher-footer {
                background: #f8f9fa;
                padding: 25px;
                text-align: center;
                font-size: 14px;
                color: #666;
                border-top: 1px solid #eee;
            }
            
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #e91e63;
                margin-bottom: 10px;
            }
            
            .decorative-border {
                height: 6px;
                background: linear-gradient(90deg, #e91e63, #f06292, #e91e63);
                margin: 20px 0;
            }
            
            .cherry-blossom {
                position: absolute;
                width: 30px;
                height: 30px;
                background: rgba(255,255,255,0.2);
                border-radius: 50%;
                top: 20px;
                right: 30px;
            }
            
            .cherry-blossom::before {
                content: '🌸';
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 20px;
            }
            
            @media print {
                body {
                    background: white;
                }
                
                .voucher-container {
                    box-shadow: none;
                    border: 2px solid #e91e63;
                }
            }
        </style>
    </head>
    <body>
        <div class="voucher-container">
            <div class="voucher-header">
                <div class="cherry-blossom"></div>
                <h1 class="voucher-title">HANAMI SPA</h1>
                <p class="voucher-subtitle">Bon Prezentowy</p>
            </div>
            
            <div class="voucher-body">
                <div class="decorative-border"></div>
                
                <div class="voucher-code">
                    ${voucher.code}
                </div>
                
                <div class="voucher-details">
                    <div class="detail-row">
                        <span class="detail-label">Właściciel:</span>
                        <span class="detail-value">${voucherOwner}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Usługa:</span>
                        <span class="detail-value">${serviceInfo}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Wartość:</span>
                        <span class="detail-value value-highlight">${voucherValue}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Ważny do:</span>
                        <span class="detail-value">${expiryDate}</span>
                    </div>
                    
                    ${voucher.notes ? `
                    <div class="detail-row">
                        <span class="detail-label">Notatki:</span>
                        <span class="detail-value">${voucher.notes}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div class="decorative-border"></div>
            </div>
            
            <div class="voucher-footer">
                <div class="logo">🌸 HANAMI SPA 🌸</div>
                <p>Bon do realizacji w salonie Hanami Spa</p>
                <p>Prezentuj ten kod przy rezerwacji wizyty</p>
                <p style="margin-top: 15px; font-style: italic;">
                    Kontakt: info@hanami-spa.pl | tel: +48 123 456 789
                </p>
            </div>
        </div>
    </body>
    </html>
    `

    // For now, we'll return the HTML content and let the browser handle PDF generation
    // In production, you could integrate with a PDF service like Puppeteer Cloud or PDFShift
    
    const htmlResponse = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Bon ${voucher.code} - Hanami Spa</title>
        <script>
          // Auto-print when page loads
          window.onload = function() {
            if (window.matchMedia) {
              var mediaQueryList = window.matchMedia('print');
              mediaQueryList.addListener(function(mql) {
                if (!mql.matches) {
                  window.close();
                }
              });
            }
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
        ${htmlContent.match(/<style>[\s\S]*?<\/style>/)[0]}
    </head>
    ${htmlContent.replace(/<style>[\s\S]*?<\/style>/, '').replace('<!DOCTYPE html><html><head><meta charset="UTF-8">', '').replace('</head>', '')}
    </html>
    `

    return new Response(htmlResponse, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    })

  } catch (error) {
    console.error('Error generating PDF:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})