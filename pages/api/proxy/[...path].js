export default async function handler(req, res) {
  const { path } = req.query;
  
  try {
    const apiPath = Array.isArray(path) ? path.join('/') : path;
    
    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryString = url.search;
    
    const apiUrl = `http://localhost:5046/api/${apiPath}${queryString}`;
    
    console.log('🔗 Fazendo request para:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || 'Bearer seu-token-aqui',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error('❌ Erro na API:', error.message);
    res.status(500).json({ 
      error: 'Erro ao conectar com a API', 
      details: error.message,
      tip: 'Verifique se sua API está rodando na porta 5000'
    });
  }
}