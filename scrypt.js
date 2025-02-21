const apiUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=';
let currentPage = 1;
let cryptos = [];
let isLoading = false; // Флаг, предотвращающий повторные загрузки
let allCryptosLoaded = false; // Флаг, указывающий, что все данные загружены

// При загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
  loadCryptos();
  window.addEventListener('scroll', handleScroll); // Бесконечная прокрутка
  document.getElementById('refreshButton').addEventListener('click', refreshCryptos); // Обновление всех данных
  document.getElementById('cryptoSearch').addEventListener('input', filterCryptos); // Поиск
}); // Закрытие DOMContentLoaded

// Функция для загрузки криптовалют с API
async function loadCryptos() {
  if (isLoading || allCryptosLoaded) return; // Предотвращаем повторную загрузку
  isLoading = true;

  try {
    const response = await fetch(apiUrl + currentPage);
    const data = await response.json();

    if (data.length === 0) {
      allCryptosLoaded = true; // Все данные загружены
      return;
    }

    cryptos = cryptos.concat(data); // Добавляем новые данные
    displayCryptos(cryptos); // Отображаем криптовалюты
    currentPage++; // Увеличиваем текущую страницу
  } catch (error) {
    console.error("Ошибка загрузки данных:", error);
  } finally {
    isLoading = false; // Сбрасываем флаг загрузки
  }
}

// Функция обработки прокрутки для бесконечной загрузки
function handleScroll() {
  const scrollPosition = window.innerHeight + window.scrollY;
  const pageHeight = document.documentElement.scrollHeight;

  // Если прокручено до конца страницы, загружаем новые данные
  if (scrollPosition >= pageHeight - 500 && !isLoading && !allCryptosLoaded) {
    loadCryptos(); // Загружаем следующие криптовалюты
  }
}

// Функция обновления всех данных при нажатии кнопки "Обновить"
function refreshCryptos() {
  currentPage = 1;
  cryptos = [];
  allCryptosLoaded = false;
  document.getElementById("cryptoList").innerHTML = ""; // Очищаем список криптовалют
  loadCryptos();
}

// Функция отображения криптовалют
function displayCryptos(cryptos) {
  const cryptoList = document.getElementById("cryptoList");
  cryptoList.innerHTML = ""; // Очищаем список перед отрисовкой отфильтрованных криптовалют

  // Получаем избранные криптовалюты из localStorage
  const favorites = JSON.parse(localStorage.getItem('favorites')) || [];

  const cryptosWithFavorites = cryptos.map(crypto => {
    const isFavorite = favorites.some(fav => fav.id === crypto.id);
    return { ...crypto, isFavorite };
  });

  // Сортируем криптовалюты, чтобы избранные были в начале
  cryptosWithFavorites.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));

  cryptosWithFavorites.forEach(crypto => {
    const cryptoItem = document.createElement("div");
    cryptoItem.classList.add("crypto-item");
    cryptoItem.setAttribute("data-id", crypto.id);

    const logo = crypto.image || '';
    const price = crypto.current_price ? `$${crypto.current_price.toFixed(2)}` : 'N/A';
    const name = crypto.name || 'Неизвестное имя';
    const symbol = crypto.symbol ? crypto.symbol.toUpperCase() : 'Неизвестный символ';
    const priceChange24h = crypto.price_change_percentage_24h !== undefined ? crypto.price_change_percentage_24h.toFixed(2) : 'N/A';

    // Новый анализ тренда на основе изменения цены
    let cardColorClass = '';
    let trendMessage = '';

    if (crypto.price_change_percentage_24h <= -10) {
      cardColorClass = 'falling-card'; // Сильное падение
      trendMessage = 'Сильное падение';
    } else if (crypto.price_change_percentage_24h <= -5) {
      cardColorClass = 'falling-card'; // Умеренное падение
      trendMessage = 'Падение';
    } else if (crypto.price_change_percentage_24h >= 10) {
      cardColorClass = 'rising-card'; // Сильный рост
      trendMessage = 'Сильный рост';
    } else if (crypto.price_change_percentage_24h >= 5) {
      cardColorClass = 'rising-card'; // Умеренный рост
      trendMessage = 'Рост';
    } else {
      cardColorClass = 'neutral-card'; // Нейтральный тренд
      trendMessage = 'Нейтрально';
    }

    const starSymbol = crypto.isFavorite ? "&#9733;" : "&#9734;"; // Звезда закрашенная или пустая

  // Добавление бирж в карточку
    const exchangesList = crypto.exchanges ? crypto.exchanges.join(', ') : 'Нет данных о биржах';

    cryptoItem.innerHTML = `
      <div class="crypto-header">
        <span class="crypto-star" onclick="toggleFavorite('${crypto.id}', event)">${starSymbol}</span> <!-- Звезда в правом верхнем углу -->
      </div>
      <img src="${logo}" alt="${name} Logo" class="crypto-logo">
      <div class="crypto-content">
        <span>${name} (${symbol})</span>
        <span>Цена: ${price}</span>
        <span>Изменение за 24ч: ${priceChange24h}%</span>
        <span class="trend-message">${trendMessage}</span>
      </div>
    `;

    // Применяем класс для изменения цвета фона карточки
    cryptoItem.classList.add(cardColorClass);

    // Открытие модального окна при клике на криптовалюту (но не на звездочку)
    cryptoItem.onclick = (event) => {
      if (!event.target.classList.contains('crypto-star')) {
        showCryptoDetails(crypto);
      }
    };

    cryptoList.appendChild(cryptoItem);
  });
}

// Функция добавления/удаления криптовалюты в избранное
function toggleFavorite(cryptoId, event) {
  event.stopPropagation(); // Предотвращаем открытие модального окна

  let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  const index = favorites.findIndex(crypto => crypto.id === cryptoId);

  if (index !== -1) {
    // Удаляем из избранного
    favorites.splice(index, 1);
  } else {
    const crypto = cryptos.find(crypto => crypto.id === cryptoId);
    if (crypto) {
      favorites.unshift({ id: crypto.id, name: crypto.name, logo: crypto.image, price: crypto.current_price });
    } else {
      console.error(`Криптовалюта с id ${cryptoId} не найдена!`);
    }
  }

  localStorage.setItem('favorites', JSON.stringify(favorites)); // Сохраняем в localStorage
  displayCryptos(cryptos); // Обновляем отображение с учётом избранного
}

// Функция фильтрации криптовалют по названию и символу
function filterCryptos() {
  const searchQuery = document.getElementById("cryptoSearch").value.toLowerCase();
  const filteredCryptos = cryptos.filter(crypto => 
    crypto.name.toLowerCase().includes(searchQuery) || 
    crypto.symbol.toLowerCase().includes(searchQuery)
  );
  displayCryptos(filteredCryptos);
}

// Дополнительные функции анализа и отображения подробностей, такие как showCryptoDetails и другие


// ФУНКЦИИ АНАЛИЗА
// Функция для расчета средней капитализации всех криптовалют
function calculateAverageMarketCap() {
    const totalMarketCap = cryptos.reduce((sum, crypto) => sum + (crypto.market_cap || 0), 0);
    return cryptos.length ? totalMarketCap / cryptos.length : 0;
}

// Функция для расчета изменения цены за 24 часа и рекомендации
function calculatePriceChangeRecommendation(crypto) {
    const priceChange = crypto.price_change_percentage_24h || 0;

    let recommendationText = "";
    if (priceChange > 10) {
        recommendationText = "<strong style='color: green;'>Цена значительно выросла: более 10% за последние 24 часа.</strong> Это может указывать на сильный рост интереса и позитивное восприятие криптовалюты рынком.";
    } else if (priceChange > 5) {
        recommendationText = "<strong style='color: lightgreen;'>Цена немного выросла: от 5 до 10% за последние 24 часа.</strong> Это может свидетельствовать о позитивной динамике, но стоит следить за тенденциями.";
    } else if (priceChange > 0) {
        recommendationText = "<strong style='color: gray;'>Цена немного выросла: менее 5% за последние 24 часа.</strong> Позитивная, но умеренная динамика, возможно, это стабильный рост.";
    } else if (priceChange >= -5) {
        recommendationText = "<strong style='color: orange;'>Цена немного снизилась: от 0 до -5% за последние 24 часа.</strong> Следует внимательно отслеживать, возможно, это временное падение.";
    } else if (priceChange >= -10) {
        recommendationText = "<strong style='color: red;'>Цена значительно снизилась: от -5 до -10% за последние 24 часа.</strong> Это может сигнализировать о продажах и снижении интереса, будьте осторожны.";
    } else {
        recommendationText = "<strong style='color: darkred;'>Цена резко снизилась: более чем на 10% за последние 24 часа.</strong> Это может быть сигналом о серьезных проблемах или коррекции на рынке, действуйте осторожно.";
    }

    return recommendationText;
}

// Функция для расчета рекомендаций по циркулирующему объему
function calculateCirculatingSupplyRecommendation(crypto) {
    const circulatingSupply = crypto.circulating_supply || 0;
    const averageSupply = cryptos.reduce((sum, crypto) => sum + (crypto.circulating_supply || 0), 0) / cryptos.length;

    let recommendationText = "";
    if (circulatingSupply > averageSupply * 1.5) {
        recommendationText = "<strong style='color: green;'>Циркулирующее предложение значительно выше среднего.</strong> Это может указывать на потенциал роста, но также на увеличение риска.";
    } else if (circulatingSupply > averageSupply) {
        recommendationText = "<strong style='color: lightgreen;'>Циркулирующее предложение выше среднего.</strong> Потенциал роста может быть, но следует быть осторожным.";
    } else {
        recommendationText = "<strong style='color: red;'>Циркулирующее предложение ниже среднего.</strong> Это может указывать на снижение интереса или проблемы с ликвидностью.";
    }

    return recommendationText;
}


// Функция для отображения подробной информации с расширенной рекомендацией
function showCryptoDetails(crypto) {
    const modal = document.getElementById("cryptoModal");
    const name = document.getElementById("cryptoName");
    const price = document.getElementById("cryptoPrice");
    const change = document.getElementById("cryptoChange");
    const marketCap = document.getElementById("cryptoMarketCap");
    const supply = document.getElementById("cryptoSupply");
    const recommendation = document.getElementById("cryptoRecommendation");
    const priceChangeRecommendation = document.getElementById("cryptoPriceChangeRecommendation");
    const supplyRecommendation = document.getElementById("cryptoSupplyRecommendation");

    name.textContent = crypto.name || 'Неизвестное имя';
    price.textContent = `$${crypto.current_price ? crypto.current_price.toFixed(2) : 'N/A'}`;
    change.textContent = `${crypto.price_change_percentage_24h !== undefined ? crypto.price_change_percentage_24h.toFixed(2) + '%' : 'N/A'}`;
    marketCap.textContent = crypto.market_cap ? `$${crypto.market_cap.toLocaleString()}` : 'N/A';
    supply.textContent = crypto.circulating_supply 
        ? `${crypto.circulating_supply.toLocaleString()} ${crypto.symbol.toUpperCase()}`
        : 'N/A';

    const averageMarketCap = calculateAverageMarketCap();
    const capDifference = ((crypto.market_cap - averageMarketCap) / averageMarketCap) * 100;

  
  
  // Устанавливаем логотип криптовалюты
  const logoUrl = crypto.image ? crypto.image : ''; // Проверка наличия логотипа
  document.getElementById("cryptoLogo").src = logoUrl;



    // Расширенные рекомендации в зависимости от диапазона капитализации
    let recommendationText = "";
    if (capDifference > 50) {
        recommendationText = "<strong style='color: green;'>Очень высокая капитализация: более чем на 50% выше средней.</strong> Это может указывать на значительное доверие рынка и стабильную позицию, однако возможен риск коррекции, если актив переоценён.";
    } else if (capDifference > 20) {
        recommendationText = "<strong style='color: green;'>Высокая капитализация: на 20-50% выше средней.</strong> Текущая капитализация показывает хорошую позицию на рынке, но следите за возможными изменениями в ликвидности.";
    } else if (capDifference > 5) {
        recommendationText = "<strong style='color: lightgreen;'>Слегка выше среднего: на 5-20% выше средней.</strong> Показатель выше среднего, что указывает на положительные ожидания инвесторов.";
    } else if (capDifference >= -5 && capDifference <= 5) {
        recommendationText = "<strong style='color: gray;'>Средняя капитализация: в пределах ±5% от средней.</strong> Актив имеет стабильное положение и соответствует средним показателям на рынке. Может быть подходящим для консервативных инвесторов.";
    } else if (capDifference >= -20) {
        recommendationText = "<strong style='color: orange;'>Слегка ниже среднего: на 5-20% ниже средней.</strong> Рекомендуется следить за показателями, так как актив может столкнуться с недостаточной ликвидностью или временными трудностями.";
    } else if (capDifference >= -50) {
        recommendationText = "<strong style='color: red;'>Низкая капитализация: на 20-50% ниже средней.</strong> Актив может быть недооценён, но также это может сигнализировать о недостатке спроса. Подходит для рискованных инвестиций.";
    } else {
        recommendationText = "<strong style='color: darkred;'>Очень низкая капитализация: более чем на 50% ниже средней.</strong> Это может указывать на существенные проблемы или низкий интерес к активу. Рекомендуется проявить осторожность.";
    }

    recommendation.innerHTML = recommendationText;

    // Рекомендации по изменению цены за 24 часа
    const priceChangeRecText = calculatePriceChangeRecommendation(crypto);
    priceChangeRecommendation.innerHTML = priceChangeRecText;

    // Рекомендации по циркулирующему объему
    const supplyRecText = calculateCirculatingSupplyRecommendation(crypto);
    supplyRecommendation.innerHTML = supplyRecText;

    modal.style.display = "flex";
    modal.classList.add('show');
}

// Функция для закрытия модального окна
function closeModal() {
    const modal = document.getElementById("cryptoModal");
    modal.style.display = "none";
    modal.classList.remove('show');
}

// Обработчик для закрытия модального окна при клике за пределы
window.onclick = function(event) {
    const modal = document.getElementById("cryptoModal");
    if (event.target === modal) {
        closeModal();
    }
}

// ЯЗЫК
function setLanguage(lang) {
    // Скрыть все описания
    document.getElementById('description-en').style.display = 'none';
    document.getElementById('description-ru').style.display = 'none';
    document.getElementById('description-ua').style.display = 'none';

    // Показать выбранный язык
    document.getElementById(`description-${lang}`).style.display = 'block';
}

// копировать адреса
    function copyToClipboard(value) {
        const textArea = document.createElement("textarea");
        textArea.value = value;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Address copied to clipboard!');
    }
