import axios from "axios";

/**
 * Serviço simples para enviar mensagens ao Telegram.
 * Não salva tokens em código - usa env.
 */
export class TelegramService {
  private queue: Array<{
    text: string;
    resolve: (v: any) => void;
    reject: (e: any) => void;
  }> = [];
  private running = false;

  constructor(private token: string, private chatId: string) {}

  private get baseUrl() {
    return `https://api.telegram.org/bot${this.token}`;
  }

  /**
   * Envia mensagem ao Telegram com fila (anti-429 / flood control).
   * Mantém compatibilidade com "await sendMessage".
   */
  async sendMessage(text: string) {
    return new Promise((resolve, reject) => {
      this.queue.push({ text, resolve, reject });
      this.runQueue();
    });
  }

  private async runQueue() {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const { data } = await axios.post(
          `${this.baseUrl}/sendMessage`,
          {
            chat_id: this.chatId,
            text: item.text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          },
          { timeout: 15000 }
        );

        item.resolve(data?.result);

        // ✅ Limite seguro: ~1 msg/seg
        await this.sleep(1100);
      } catch (err: any) {
        const status = err?.response?.status;

        // 429: Telegram flood control. Respeita retry_after.
        if (status === 429) {
          const retryAfter =
            err?.response?.data?.parameters?.retry_after ??
            err?.response?.headers?.["retry-after"];

          const waitMs = Math.max(1, Number(retryAfter || 2)) * 1000;
          // Recoloca na frente da fila e espera
          this.queue.unshift(item);
          await this.sleep(waitMs + 250);
          continue;
        }

        // Erro não-429: loga, não trava a fila
        item.reject(err);
        await this.sleep(1200);
      }
    }

    this.running = false;
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}
