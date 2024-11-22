import whatsappService from './whatsappService.js';
import appendToSheet from './googleSheetsServices.js';
import openAiService from './openAiService.js';

class MessageHandler {

  constructor(){
    this.quotationState = {};
    this.assistandState = {};
  }
  async handleIncomingMessage(message, senderInfo) {
    if (message?.type === 'text') {
      const incomingMessage = message.text.body.toLowerCase().trim();

      if(this.isGreeting(incomingMessage)){
        await this.sendWelcomeMessage(message.from, message.id, senderInfo);
        await this.sendWelcomeMenu(message.from)
      }else if (incomingMessage === 'media'){
        await this.sendMedia(message.from)
      } else if(this.quotationState[message.from]){
        await this.handleQuotationFlow(message.from, incomingMessage);
      }  else if (this.assistandState[message.from]) {
        await this.handleAssistandFlow(message.from, incomingMessage);
      }     
      else {
        const response = `Echo: ${message.text.body}`;
        await whatsappService.sendMessage(message.from, response, message.id);
      }
      await whatsappService.markAsRead(message.id);
    }else if (message?.type === 'interactive'){
      //const option = message?.interactive?.button_reply?.title.toLowerCase().trim();
      const option = message?.interactive?.button_reply?.id;
      await this.handelMenuOption(message.from, option);
      await whatsappService.markAsRead(message.id)

    }
  }

  isGreeting(message) {
    const greetings = ["hola", "hello", "hi", "buenas tardes"];
    return greetings.includes(message);
  }

  getSenderName(senderInfo) {
    return senderInfo.profile?.name || senderInfo.wa_id;
  }

  async sendWelcomeMessage(to, messageId, senderInfo) {
    const name = this.getSenderName(senderInfo);
    const welcomeMessage = `Hola ${name}, Bienvenido a RubTech_Bot 🤖, Tu tienda de domotica en línea. ¿En qué puedo ayudarte hoy?`;
    await whatsappService.sendMessage(to, welcomeMessage, messageId);
  }

  async sendWelcomeMenu(to){
    const menuMessage = 'Elige una Opcion'
    const buttons = [
      {
        type: 'reply', reply: { id: 'cotizacion', title: 'Cotizacion'}
      },
      {
        type: 'reply', reply: { id: 'consulta', title: 'Consulta'}
      },
      {
        type: 'reply', reply: { id: 'ubicacion', title: 'Ubicacion'}
      }
    ]

    await whatsappService.sendInterateButtons(to, menuMessage, buttons)
  }

  async handelMenuOption(to, option){
    let response;
    console.log("Response ", response, "option:", option)
    switch(option){
      case 'cotizacion':
        this.quotationState[to] = {step: 'name'}
        response = 'Por favor ingresa tu Nombre';
        break;
      case 'consulta':
        this.assistandState[to] = { step: 'question' };
        response = "Realiza tu consulta"
        break
      case 'ubicacion':
        response = 'Te esperamos en nuestra sucursal';
        await this.sendLocation(to)
        break
      case 'personal':
        response = 'Si requieres hablar con alguno de nuestros agentes, te invitamos a llamar a nuestra linea de atencion'
        await this.sendContact(to)
        break
      default: 
        response = 'Lo siento no entendi tu seleccion, por favor elige una de las opciones del menu.'
    }
    await whatsappService.sendMessage(to, response)
  }

  async sendMedia(to){
    //Audio
/*     const mediaUrl = 'https://drive.google.com/file/d/1jmwYABCFLM_1uAqk4EcJnYEIQcpzPh4i/view';
    const caption = 'Bienvenidad';
    const type = 'audio'; */

    // imagen
/*     const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/RubTech-imagen.png';
    const caption = 'Esto es una imagen';
    const type = 'image'; */

        // Video
/*     const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/RubTech-video.mp4';
    const caption = 'Bienvenidad';
    const type = 'video'; */
        // File
    const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/RubTech-file.pdf';
    const caption = 'Esto es un Documento';
    const type = 'document';

    await whatsappService.sendMediaMessage(to, type, mediaUrl, caption);
  } 

  completeQuotation(to){
    const quotation = this.quotationState[to];
    delete this.quotationState[to];

    const userData = [
      to,
      quotation.name,
      quotation.productType,
      quotation.productName,
      quotation.location,
      new Date().toISOString()
    ]

    appendToSheet(userData)

    return `Gracias por solicitar su cotizacion 
    Detalles de la cotizacion:

    *Nombre:* ${quotation.name}
    *Tipo Producto:* ${quotation.productType}
    *Nombre Producto:* ${quotation.productName}
    *Ubicacion:* ${quotation.location}

    Nos pondremos en contacto contigo pronto
    `
  }

  async handleQuotationFlow(to, message){
    const state = this.quotationState[to];
    let response;

    switch (state.step) {
      case 'name':
        state.name = message;
        state.step = 'productType';
        response = "Gracias, ahora indicame en que tipo de producto estas interesado (por ejemplo: camaras de seguridad, productos de domotica)";        
        break;
      case 'productType':
        state.productType = message;
        state.step = 'productName';
        response = '¿Indica el nombre del producto?';
        break;
      case 'productName':
        state.productName = message;
        state.step = 'location';
        response = '¿Donde se encuentra ubicado?'
        break
      case 'location':
        state.location = message;
        response = this.completeQuotation(to);
        break;
    }

    await whatsappService.sendMessage(to, response);
  }

  async handleAssistandFlow(to, message) {
    const state = this.assistandState[to];
    let response;

    const menuMessage = "¿La respuesta fue de tu ayuda?"
    const buttons = [
      { type: 'reply', reply: { id: 'option 4', title: "Si, Gracias" } },
      { type: 'reply', reply: { id: 'otraPregunta', title: 'Hacer otra pregunta'}},
      { type: 'reply', reply: { id: 'personal', title: 'Hablar con personal'}}
    ];

    if (state.step === 'question') {
      response = await openAiService(message);
    }

    delete this.assistandState[to];
    await whatsappService.sendMessage(to, response);
    await whatsappService.sendInterateButtons(to, menuMessage, buttons);
  }

  async sendContact(to){
    const contact = {
      addresses: [
        {
          street: "123 Calle de las Mascotas",
          city: "Ciudad",
          state: "Estado",
          zip: "12345",
          country: "País",
          country_code: "PA",
          type: "WORK"
        }
      ],
      emails: [
        {
          email: "contacto@rubtech.com",
          type: "WORK"
        }
      ],
      name: {
        formatted_name: "RubTech Contacto",
        first_name: "RubTech",
        last_name: "Contacto",
        middle_name: "",
        suffix: "",
        prefix: ""
      },
      org: {
        company: "RubTech",
        department: "Atención al Cliente",
        title: "Representante"
      },
      phones: [
        {
          phone: "+1234567890",
          wa_id: "1234567890",
          type: "WORK"
        }
      ],
      urls: [
        {
          url: "https://www.RubTech.com",
          type: "WORK"
        }
      ]
    };

    await whatsappService.sendContactMessage(to, contact);
  }

  async sendLocation(to){
    //4.959245234944318, -73.93206426760153
    const latitude = 4.959245234944318;
    const longitude = -73.93206426760153;
    const name = 'Conjunto Residencial OLIVO - Los Maderos';
    const address = 'LT Area Util # 2B, Estancias de San Jorge, Vereda, Verganzo, Tocancipá, Cundinamarca';

    await whatsappService.sendLocationMessage(to, latitude, longitude, name, address);
  }

}

export default new MessageHandler();