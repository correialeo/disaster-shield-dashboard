export default async function handler(req, res) {
  try {
    const queryString = new URLSearchParams(req.query).toString();
    const apiUrl = `http://localhost:5046/api/Statistics/dashboard${queryString ? '?' + queryString : ''}`;
    
    console.log('🔗 Fazendo request para:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': 'Bearer seu-token-aqui',
      },
    });

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Dados recebidos com sucesso');
    
    res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Erro na API:', error.message);
    res.status(500).json({ 
      error: 'Erro ao conectar com a API', 
      details: error.message,
      tip: 'Verifique se sua API está rodando na porta 5000 e se os endpoints estão funcionando'
    });
  }
}