import whatsappService from './whatsappService.js';

class MessageHandler {
  async handleIncomingMessage(message, senderInfo) {
    if (message?.type === 'text') {
      const incomingMessage = message.text.body.toLowerCase().trim();

      if(this.isGreeting(incomingMessage)){
        await this.sendWelcomeMessage(message.from, message.id, senderInfo);
        await this.sendWelcomeMenu(message.from)
      }else if (incomingMessage === 'media'){
        await this.sendMedia(message.from)
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
        type: 'reply', reply: { id: 'option 1', title: 'Agendar'}
      },
      {
        type: 'reply', reply: { id: 'option 2', title: 'Consultar'}
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
      case 'agendar':
        response = 'Agendar Cita';
        break;
      case 'consultar':
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
}

export default new MessageHandler();