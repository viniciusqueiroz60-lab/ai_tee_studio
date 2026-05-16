import { ChevronLeft } from 'lucide-react';

export default function PrivacyPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="py-10 max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors mb-8"
      >
        <ChevronLeft className="w-4 h-4" /> Voltar
      </button>

      <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">Política de Privacidade</h1>
      <p className="text-sm text-gray-400 mb-10">Última atualização: maio de 2026</p>

      <div className="prose prose-sm max-w-none space-y-8 text-gray-700 leading-relaxed">

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Quem somos</h2>
          <p>
            A <strong>AI T-Studio</strong> ("nós", "nosso") é uma plataforma brasileira de criação e venda de camisetas
            personalizadas com inteligência artificial. Esta Política de Privacidade descreve como coletamos, usamos,
            armazenamos e protegemos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados
            (Lei n.º 13.709/2018 — LGPD).
          </p>
          <p className="mt-2">
            <strong>Controlador dos dados:</strong> AI T-Studio LTDA. — contato: privacidade@aitshirt.com.br
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Quais dados coletamos</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Dados de conta (Google Login):</strong> nome, endereço de e-mail e foto de perfil fornecidos
              pelo Google ao fazer login. Não armazenamos sua senha.
            </li>
            <li>
              <strong>Dados de pedido:</strong> endereço de entrega, dados do pedido (tamanho, cor, design escolhido)
              e informações de pagamento processadas pelo Stripe. Não armazenamos números de cartão — o Stripe é o
              responsável pelo processamento seguro.
            </li>
            <li>
              <strong>Dados de uso:</strong> designs gerados, interações com a plataforma, tokens utilizados e
              histórico de atividade, associados ao seu UID de usuário.
            </li>
            <li>
              <strong>Cookies e dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e
              páginas acessadas, coletados via Firebase Analytics com seu consentimento.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Como usamos seus dados</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Autenticar sua conta e manter sua sessão ativa.</li>
            <li>Processar pedidos, enviar confirmações e gerenciar entregas.</li>
            <li>Contabilizar tokens, pontos de rebate e histórico de vendas.</li>
            <li>Melhorar a plataforma por meio de análise de uso agregado (Firebase Analytics).</li>
            <li>Cumprir obrigações legais, fiscais e regulatórias.</li>
            <li>Enviar comunicações sobre pedidos e, com seu consentimento, novidades e promoções.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Base legal para o tratamento (LGPD)</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Execução de contrato</strong> — para processar pedidos e manter sua conta.</li>
            <li><strong>Consentimento</strong> — para cookies analíticos, de marketing e comunicações opcionais.</li>
            <li><strong>Obrigação legal</strong> — para cumprimento de normas fiscais e regulatórias.</li>
            <li><strong>Interesse legítimo</strong> — para prevenção de fraudes e segurança da plataforma.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Cookies</h2>
          <p>Utilizamos os seguintes tipos de cookies:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Essenciais:</strong> necessários para o funcionamento do site (autenticação, carrinho). Sempre ativos.
            </li>
            <li>
              <strong>Analytics (Firebase Analytics):</strong> coletam dados anônimos de navegação para melhorarmos
              a experiência. Ativados apenas com seu consentimento.
            </li>
            <li>
              <strong>Marketing:</strong> usados para personalizar conteúdo e exibir anúncios relevantes.
              Ativados apenas com seu consentimento.
            </li>
          </ul>
          <p className="mt-3">
            Você pode alterar suas preferências de cookies a qualquer momento clicando em
            <strong> "Preferências de cookies"</strong> no rodapé do site.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Compartilhamento de dados</h2>
          <p>Não vendemos seus dados pessoais. Compartilhamos informações apenas com:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Google Firebase:</strong> autenticação, banco de dados Firestore, armazenamento de imagens e
              analytics. Política de privacidade: <a href="https://firebase.google.com/support/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">firebase.google.com/support/privacy</a>.
            </li>
            <li>
              <strong>Stripe:</strong> processamento de pagamentos. Política de privacidade:
              <a href="https://stripe.com/br/privacy" className="text-primary hover:underline ml-1" target="_blank" rel="noopener noreferrer">stripe.com/br/privacy</a>.
            </li>
            <li>
              <strong>Parceiros de entrega:</strong> nome e endereço para envio dos pedidos.
            </li>
            <li>
              <strong>Autoridades:</strong> quando exigido por lei ou ordem judicial.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Retenção de dados</h2>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Após a exclusão da conta, removemos
            seus dados pessoais em até <strong>90 dias</strong>, exceto quando houver obrigação legal de retenção
            (ex.: dados fiscais de transações, retidos por 5 anos conforme exigência do Fisco).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Seus direitos (LGPD)</h2>
          <p>Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>Acesso:</strong> solicitar uma cópia dos dados que temos sobre você.</li>
            <li><strong>Correção:</strong> corrigir dados incompletos ou desatualizados.</li>
            <li><strong>Exclusão:</strong> solicitar a remoção dos seus dados (quando não houver obrigação legal de retenção).</li>
            <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado.</li>
            <li><strong>Oposição:</strong> opor-se ao tratamento baseado em interesse legítimo.</li>
            <li><strong>Revogação de consentimento:</strong> retirar o consentimento a qualquer momento.</li>
            <li><strong>Reclamação:</strong> registrar queixa perante a Autoridade Nacional de Proteção de Dados (ANPD).</li>
          </ul>
          <p className="mt-3">
            Para exercer seus direitos, envie um e-mail para <strong>privacidade@aitshirt.com.br</strong>.
            Respondemos em até 15 dias úteis.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Segurança</h2>
          <p>
            Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo criptografia em
            trânsito (HTTPS/TLS), controle de acesso baseado em função (Firebase Security Rules) e
            monitoramento de acessos suspeitos. Em caso de incidente de segurança que possa gerar risco
            relevante, notificaremos a ANPD e os titulares afetados conforme exigido pela LGPD.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">10. Transferência internacional de dados</h2>
          <p>
            Seus dados podem ser processados fora do Brasil pelos nossos fornecedores (Google e Stripe),
            que estão sediados nos Estados Unidos. Essas transferências ocorrem com base em cláusulas
            contratuais adequadas e em conformidade com o Art. 33 da LGPD.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">11. Menores de idade</h2>
          <p>
            Nossa plataforma não é destinada a menores de 18 anos. Não coletamos intencionalmente dados
            de menores. Se tomarmos conhecimento de que coletamos dados de um menor sem o consentimento dos
            responsáveis, excluiremos essas informações imediatamente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">12. Alterações nesta política</h2>
          <p>
            Podemos atualizar esta Política de Privacidade periodicamente. Publicaremos a nova versão nesta
            página com a data de revisão atualizada. Para mudanças significativas, enviaremos uma notificação
            por e-mail ou exibiremos um aviso na plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">13. Contato</h2>
          <p>
            Dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus dados? Entre em contato
            com nosso Encarregado de Proteção de Dados (DPO):
          </p>
          <p className="mt-2 font-bold">privacidade@aitshirt.com.br</p>
          <p className="text-sm text-gray-500 mt-1 italic">
            Conteúdo elaborado como base para revisão jurídica. Consulte um advogado especializado em LGPD
            antes de publicar em produção.
          </p>
        </section>
      </div>
    </div>
  );
}
