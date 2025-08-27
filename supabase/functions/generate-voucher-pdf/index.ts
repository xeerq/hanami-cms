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

    // Create HTML template for PDF that matches the uploaded voucher design exactly
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4;
                margin: 10mm;
            }
            
            body {
                font-family: 'Times New Roman', serif;
                margin: 0;
                padding: 20px;
                background: white;
                color: black;
                line-height: 1.4;
                font-size: 18px;
            }
            
            .voucher-container {
                max-width: 650px;
                margin: 0 auto;
                background: white;
                padding: 30px 40px;
                border: 2px solid #000;
                min-height: 85vh;
                position: relative;
                box-sizing: border-box;
            }
            
            .header {
                text-align: center;
                margin-bottom: 40px;
            }
            
            .salon-title {
                font-size: 36px;
                font-weight: normal;
                margin: 0 0 15px 0;
                letter-spacing: 1px;
            }
            
            .logo-container {
                margin: 20px 0 25px 0;
                text-align: center;
            }
            
            .logo-image {
                max-width: 300px;
                height: auto;
            }
            
            .subtitle {
                font-size: 22px;
                margin: 20px 0 40px 0;
                font-weight: normal;
            }
            
            .content {
                font-size: 18px;
                line-height: 2.2;
                margin: 30px 0;
            }
            
            .recipient-line {
                margin: 25px 0;
                display: flex;
                align-items: baseline;
                min-height: 25px;
            }
            
            .recipient-label {
                margin-right: 8px;
                white-space: nowrap;
            }
            
            .recipient-dots {
                flex: 1;
                border-bottom: 1px dotted #000;
                margin-right: 8px;
                min-height: 1px;
                margin-bottom: 3px;
            }
            
            .recipient-value {
                font-weight: bold;
                min-width: fit-content;
            }
            
            .service-line {
                margin: 25px 0;
                line-height: 1.8;
            }
            
            .value-line {
                margin: 25px 0;
                display: flex;
                align-items: baseline;
                min-height: 25px;
            }
            
            .value-label {
                margin-right: 8px;
                white-space: nowrap;
            }
            
            .value-dots {
                flex: 1;
                border-bottom: 1px dotted #000;
                margin-right: 8px;
                min-height: 1px;
                margin-bottom: 3px;
            }
            
            .value-amount {
                font-weight: bold;
                min-width: fit-content;
            }
            
            .footer {
                position: absolute;
                bottom: 30px;
                left: 40px;
                right: 40px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                font-size: 14px;
            }
            
            .contact-info {
                text-align: left;
                line-height: 1.3;
                max-width: 250px;
            }
            
            .validity-info {
                text-align: right;
                line-height: 1.8;
            }
            
            .validity-line {
                display: flex;
                align-items: baseline;
                margin: 8px 0;
            }
            
            .validity-label {
                margin-right: 8px;
                white-space: nowrap;
            }
            
            .validity-dots {
                border-bottom: 1px dotted #000;
                min-width: 150px;
                margin-right: 8px;
                margin-bottom: 3px;
            }
            
            .validity-value {
                font-weight: bold;
                min-width: fit-content;
            }
            
            .number-line {
                display: flex;
                align-items: baseline;
                margin: 8px 0;
            }
            
            .number-label {
                margin-right: 8px;
                white-space: nowrap;
            }
            
            .number-dots {
                border-bottom: 1px dotted #000;
                min-width: 150px;
                margin-right: 8px;
                margin-bottom: 3px;
            }
            
            .number-value {
                font-weight: bold;
                min-width: fit-content;
            }
            
            @media print {
                body {
                    padding: 0;
                    margin: 0;
                }
                
                .voucher-container {
                    border: 2px solid #000;
                    box-shadow: none;
                    margin: 0;
                }
                
                .footer {
                    position: fixed;
                    bottom: 30px;
                }
            }
        </style>
    </head>
    <body>
        <div class="voucher-container">
            <div class="header">
                <div class="salon-title">Salon</div>
                <div class="logo-container">
                    <img src="/lovable-uploads/ca126b9c-7595-42ce-ba12-c10c932b3e07.png" alt="Hanami SPA Logo" class="logo-image">
                </div>
                <div class="subtitle">serdecznie zaprasza</div>
            </div>
            
            <div class="content">
                <div class="recipient-line">
                    <span class="recipient-label">Panią/Pana</span>
                    <div class="recipient-dots"></div>
                    <span class="recipient-value">${voucherOwner}</span>
                </div>
                
                <div class="service-line">
                    na zabieg ${serviceInfo.toLowerCase()}
                </div>
                
                <div class="value-line">
                    <span class="value-label">o wartości</span>
                    <div class="value-dots"></div>
                    <span class="value-amount">${voucherValue}</span>
                </div>
            </div>
            
            <div class="footer">
                <div class="contact-info">
                    Prosimy o kontakt w celu<br>
                    ustalenia daty wizyty w Salonie.<br><br>
                    tel: 605 412 692<br>
                    63-400 Ostrów Wielkopolski,<br>
                    ul. Raszkowska 80e
                </div>
                
                <div class="validity-info">
                    <div class="validity-line">
                        <span class="validity-label">bon ważny do</span>
                        <div class="validity-dots"></div>
                        <span class="validity-value">${expiryDate}</span>
                    </div>
                    <div class="number-line">
                        <span class="number-label">numer</span>
                        <div class="number-dots"></div>
                        <span class="number-value">${voucher.code}</span>
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