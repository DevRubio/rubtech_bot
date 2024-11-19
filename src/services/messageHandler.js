import whatsappService from './whatsappService.js';
import appendToSheet from './googleSheetsServices.js';

class MessageHandler {

  constructor(){
    this.quotationState = {};
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
      }      
      else {
        const response = `Echo: ${message.text.body}`;
        await whatsappService.sendMessage(message.from, response, message.id);
      }
      await whatsappService.markAsRead(message.id);
    }else if (message?.type === 'interactive'){
      const option = message?.interactive?.button_reply?.title.toLowerCase().trim();
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
        type: 'reply', reply: { id: 'option 1', title: 'Cotizacion'}
      },
      {
        type: 'reply', reply: { id: 'option 2', title: 'Consulta'}
      },
      {
        type: 'reply', reply: { id: 'option 3', title: 'Ubicacion'}
      }
    ]

    await whatsappService.sendInterateButtons(to, menuMessage, buttons)
  }

  async handelMenuOption(to, option){
    let response;
    switch(option){
      case 'cotizacion':
        this.quotationState[to] = {step: 'name'}
        response = 'Por favor ingresa tu Nombre';
        break;
      case 'consulta':
        response = "Realiza tu consulta"
        break
      case 'ubicacion':
        response = 'Esta es nuestra ubicacion';
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
/*     const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-imagen.png';
    const caption = 'Esto es una imagen';
    const type = 'image'; */

        // Video
/*     const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-video.mp4';
    const caption = 'Bienvenidad';
    const type = 'video'; */
        // File
    const mediaUrl = 'https://s3.amazonaws.com/gndx.dev/medpet-file.pdf';
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
}

export default new MessageHandler();