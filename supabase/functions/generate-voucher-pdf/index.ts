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

    // Create professional spa voucher HTML template
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4 portrait;
                margin: 15mm;
            }
            
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Georgia', 'Times New Roman', serif;
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
                color: #2c3e50;
                font-size: 14px;
                line-height: 1.6;
            }
            
            .voucher-container {
                width: 520px;
                min-height: 380px;
                padding: 40px;
                background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
                border: 3px solid #d4a574;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                margin: 0 auto;
                position: relative;
                overflow: hidden;
            }
            
            .voucher-container::before {
                content: '';
                position: absolute;
                top: -5px;
                left: -5px;
                right: -5px;
                bottom: -5px;
                background: linear-gradient(45deg, #d4a574, #f4e4c1, #d4a574);
                z-index: -1;
                border-radius: 18px;
            }
            
            .decorative-corners {
                position: absolute;
                width: 30px;
                height: 30px;
                border: 2px solid #d4a574;
            }
            
            .corner-top-left {
                top: 15px;
                left: 15px;
                border-right: none;
                border-bottom: none;
            }
            
            .corner-top-right {
                top: 15px;
                right: 15px;
                border-left: none;
                border-bottom: none;
            }
            
            .corner-bottom-left {
                bottom: 15px;
                left: 15px;
                border-right: none;
                border-top: none;
            }
            
            .corner-bottom-right {
                bottom: 15px;
                right: 15px;
                border-left: none;
                border-top: none;
            }
            
            .header {
                text-align: center;
                margin-bottom: 35px;
                padding-bottom: 20px;
                border-bottom: 2px solid #d4a574;
            }
            
            .spa-title {
                font-size: 32px;
                font-weight: bold;
                color: #d4a574;
                margin: 0 0 5px 0;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
                font-family: 'Georgia', serif;
            }
            
            .spa-subtitle {
                font-size: 16px;
                color: #7f8c8d;
                margin: 0 0 15px 0;
                font-style: italic;
            }
            
            .voucher-type {
                background: #d4a574;
                color: white;
                padding: 8px 20px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: bold;
                display: inline-block;
                margin: 10px 0;
            }
            
            .content {
                margin: 30px 0;
                text-align: center;
            }
            
            .recipient-section {
                background: rgba(212, 165, 116, 0.1);
                padding: 20px;
                border-radius: 10px;
                margin: 20px 0;
                border-left: 4px solid #d4a574;
            }
            
            .recipient-line {
                font-size: 16px;
                margin: 10px 0;
                color: #2c3e50;
            }
            
            .recipient-name {
                font-weight: bold;
                color: #d4a574;
                font-size: 18px;
            }
            
            .service-info {
                margin: 25px 0;
                padding: 15px;
                background: rgba(255, 255, 255, 0.7);
                border-radius: 8px;
                border: 1px solid #d4a574;
            }
            
            .service-title {
                font-size: 18px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 8px;
            }
            
            .value-section {
                background: #d4a574;
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                margin: 20px 0;
                text-align: center;
            }
            
            .value-label {
                font-size: 14px;
                margin-bottom: 5px;
            }
            
            .value-amount {
                font-size: 24px;
                font-weight: bold;
            }
            
            .instructions {
                margin: 25px 0;
                padding: 15px;
                background: rgba(52, 152, 219, 0.1);
                border-radius: 8px;
                border-left: 4px solid #3498db;
                font-size: 14px;
                color: #2c3e50;
                text-align: left;
            }
            
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #d4a574;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                flex-wrap: wrap;
            }
            
            .contact-info {
                flex: 1;
                min-width: 200px;
            }
            
            .contact-title {
                font-weight: bold;
                color: #d4a574;
                margin-bottom: 8px;
            }
            
            .contact-details {
                font-size: 13px;
                line-height: 1.5;
                color: #5a6c7d;
            }
            
            .voucher-details {
                flex: 1;
                text-align: right;
                min-width: 200px;
            }
            
            .detail-line {
                margin: 5px 0;
                font-size: 13px;
            }
            
            .detail-label {
                color: #7f8c8d;
            }
            
            .detail-value {
                font-weight: bold;
                color: #2c3e50;
            }
            
            @media print {
                body {
                    background: white;
                }
                
                .voucher-container {
                    box-shadow: none;
                    margin: 0;
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="voucher-container">
            <div class="decorative-corners corner-top-left"></div>
            <div class="decorative-corners corner-top-right"></div>
            <div class="decorative-corners corner-bottom-left"></div>
            <div class="decorative-corners corner-bottom-right"></div>
            
            <div class="header">
                <div class="spa-title">HANAMI SPA</div>
                <div class="spa-subtitle">Centrum Relaksu i Odnowy</div>
                <div class="voucher-type">BON PREZENTOWY</div>
            </div>
            
            <div class="content">
                <div class="recipient-section">
                    <div class="recipient-line">
                        Ten bon uprawnia
                    </div>
                    <div class="recipient-name">${voucherOwner}</div>
                    <div class="recipient-line">
                        do skorzystania z naszych usług
                    </div>
                </div>
                
                <div class="service-info">
                    <div class="service-title">${serviceInfo}</div>
                </div>
                
                <div class="value-section">
                    <div class="value-label">Wartość bonu</div>
                    <div class="value-amount">${voucherValue}</div>
                </div>
                
                <div class="instructions">
                    <strong>Instrukcja korzystania:</strong><br>
                    Prosimy o wcześniejszy kontakt telefoniczny w celu umówienia wizyty. 
                    Bon należy okazać przed rozpoczęciem zabiegu.
                </div>
            </div>
            
            <div class="footer">
                <div class="contact-info">
                    <div class="contact-title">Kontakt i rezerwacje</div>
                    <div class="contact-details">
                        📞 605 412 692<br>
                        📍 ul. Raszkowska 80e<br>
                        63-400 Ostrów Wielkopolski
                    </div>
                </div>
                
                <div class="voucher-details">
                    <div class="detail-line">
                        <span class="detail-label">Numer bonu:</span><br>
                        <span class="detail-value">${voucher.code}</span>
                    </div>
                    <div class="detail-line">
                        <span class="detail-label">Ważny do:</span><br>
                        <span class="detail-value">${expiryDate}</span>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `

    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Frame-Options': 'SAMEORIGIN'
      },
    })

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