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
        services(name, description)
      `)
      .eq('id', voucherId)
      .single()

    // Fetch profile data separately if user_id exists
    let userProfile = null
    if (voucher && voucher.user_id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', voucher.user_id)
        .single()
      userProfile = profile
    }

    if (voucherError) {
      console.error('Error fetching voucher:', voucherError)
      throw new Error('Voucher not found')
    }

    console.log('Voucher data:', voucher)

    // Generate HTML content for the voucher
    const voucherOwner = userProfile?.first_name && userProfile?.last_name 
      ? `${userProfile.first_name} ${userProfile.last_name}`
      : voucher.purchaser_name || 'Właściciel bonu'

    const serviceInfo = voucher.services?.name || 'Wszystkie usługi'
    const voucherValue = voucher.voucher_type === 'single' 
      ? `${voucher.original_value} zł`
      : `${voucher.original_sessions} sesji`

    const expiryDate = voucher.expires_at 
      ? new Date(voucher.expires_at).toLocaleDateString('pl-PL')
      : 'Bezterminowy'

    // Create HTML template for PDF that matches exactly the uploaded voucher design
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4 portrait;
                margin: 10mm;
            }
            
            body {
                font-family: 'Times New Roman', serif;
                margin: 0;
                padding: 0;
                background: white;
                color: black;
                font-size: 16px;
                line-height: 1.4;
            }
            
            .voucher-container {
                width: 480px;
                height: 340px;
                padding: 25px;
                box-sizing: border-box;
                position: relative;
                margin: 30px auto;
                border: 2px solid #333;
                overflow: hidden;
            }
            
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .salon-title {
                font-size: 16px;
                font-weight: normal;
                margin: 0 0 8px 0;
                letter-spacing: 1px;
            }
            
            .logo-container {
                margin: 5px 0 8px 0;
                display: flex;
                justify-content: center;
                align-items: center;
            }
            
            .logo-image {
                max-width: 140px;
                height: auto;
            }
            
            .subtitle {
                font-size: 12px;
                margin: 8px 0 0 0;
                font-weight: normal;
            }
            
            .content {
                margin: 30px 0 90px 0;
                font-size: 13px;
            }
            
            .content-line {
                margin: 22px 0;
                display: flex;
                align-items: baseline;
                min-height: 22px;
            }
            
            .line-text {
                white-space: nowrap;
            }
            
            .dotted-line {
                flex: 1;
                border-bottom: 1px dotted #333;
                margin: 0 10px;
                min-height: 1px;
                position: relative;
                top: -3px;
            }
            
            .filled-value {
                font-weight: bold;
                white-space: nowrap;
                min-width: fit-content;
            }
            
            .service-line {
                margin: 22px 0;
                font-size: 13px;
                line-height: 1.6;
            }
            
            .contact-text {
                margin: 25px 0;
                font-size: 13px;
                line-height: 1.5;
                text-align: left;
            }
            
            .footer {
                position: absolute;
                bottom: 20px;
                left: 20px;
                right: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
            }
            
            .contact-section {
                font-size: 11px;
                line-height: 1.4;
                text-align: left;
                max-width: 200px;
            }
            
            .validity-section {
                text-align: right;
                font-size: 11px;
                max-width: 150px;
            }
            
            .validity-line {
                display: flex;
                align-items: baseline;
                margin: 4px 0;
                min-height: 12px;
            }
            
            .validity-label {
                white-space: nowrap;
                margin-right: 10px;
            }
            
            .validity-dots {
                border-bottom: 1px dotted #333;
                min-width: 60px;
                margin-right: 4px;
                position: relative;
                top: -1px;
            }
            
            .validity-value {
                font-weight: bold;
                white-space: nowrap;
            }
            
            @media print {
                .voucher-container {
                    width: 400px;
                    height: 280px;
                    margin: 30px auto;
                    border: 2px solid #333;
                    box-shadow: none;
                }
                
                .footer {
                    position: absolute;
                    bottom: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="voucher-container">
            <div class="header">
                <div class="salon-title">Salon</div>
                <div class="logo-container">
                    <img src="/lovable-uploads/ca126b9c-7595-42ce-ba12-c10c932b3e07.png" alt="Hanami SPA" class="logo-image">
                </div>
                <div class="subtitle">serdecznie zaprasza</div>
            </div>
            
            <div class="content">
                <div class="content-line">
                    <span class="line-text">Panią/Pana: </span>
                    <span class="filled-value">${voucherOwner}</span>
                </div>
                
                <div class="service-line">
                    na zabieg ${serviceInfo.toLowerCase()}
                </div>
                
                <div class="contact-text">
                    Prosimy o kontakt w celu<br>
                    ustalenia daty wizyty w Salonie.
                </div>
                
                <div class="content-line">
                    <span class="line-text">o wartości</span>
                    <div class="dotted-line"></div>
                    <span class="filled-value">${voucherValue}</span>
                </div>
            </div>
            
            <div class="footer">
                <div class="contact-section">
                    tel: 605 412 692<br>
                    63-400 Ostrów Wielkopolski,<br>
                    ul. Raszkowska 80e
                </div>
                
                <div class="validity-section">
                    <div class="validity-line">
                        <span class="validity-label">bon ważny do: </span>
                        <span class="validity-value">${expiryDate}</span>
                    </div>
                    <div class="validity-line">
                        <span class="validity-label">numer: </span>
                        <span class="validity-value">${voucher.code}</span>
                    </div>
                </div>
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