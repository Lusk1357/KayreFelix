/* ------------------------------------
   Arquivo: calendar.js
   Lógica do Calendário de Agendamento
   ------------------------------------ */

document.addEventListener('DOMContentLoaded', function() {
    // --- Referências aos Elementos ---
    const calendarModal = document.getElementById('calendar-modal');
    const openCalendarButton = document.getElementById('open-calendar-modal');
    const ctaButton = document.getElementById('cta-button'); // Botão CTA alternativo
    const closeCalendarButton = document.getElementById('close-calendar-modal');
    const grid = document.getElementById('calendar-grid');
    const currentWeekDisplay = document.getElementById('current-week');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const bookingModal = document.getElementById('booking-modal');
    const closeBookingModalBtn = document.getElementById('close-booking-modal');
    const modalInfo = document.getElementById('modal-info');
    const bookingForm = document.getElementById('booking-form');
    const nomeInput = document.getElementById('nome');
    const ideiaInput = document.getElementById('ideia');
    const telefoneInput = document.getElementById('telefone');
    const tamanhoInput = document.getElementById('tamanho');
    const localInput = document.getElementById('local');
    const imagemInput = document.getElementById('ideia-imagem');
    const fileNameSpan = document.getElementById('file-name');
    const alertModal = document.getElementById('alert-modal');
    const alertMessage = document.getElementById('alert-message');
    const alertCloseButton = document.getElementById('alert-close-button');

    // --- Configurações ---
    // ATENÇÃO: Verifique se esta URL está correta para seu ambiente (local ou produção)
    const API_URL = 'https://calendar-production.vercel.app';
    const workHours = { start: 9, end: 21 };
    let currentDay = new Date();
    let alertCallback = null;
    let calendarRendered = false;

    // --- Funções Auxiliares ---

    // Função para ABRIR um modal (centralizada)
    function openModal(modalElement) {
        if (!modalElement) return;
        modalElement.style.display = 'flex';
        document.body.classList.add('modal-open'); // Trava o scroll do body
    }

    // Função para FECHAR um modal (centralizada)
    function closeModal(modalElement) {
        if (!modalElement) return;
        modalElement.style.display = 'none';
        // Remove a classe apenas se NENHUM outro modal estiver visível
        // Seleciona overlays que estão explicitamente com 'display: flex'
        const anyModalOpen = document.querySelector('.modal-overlay[style*="display: flex"]');
        if (!anyModalOpen) {
            document.body.classList.remove('modal-open'); // Libera o scroll do body
        }
    }

    // Função para exibir alerta customizado
    function showCustomAlert(message, onConfirm = null) {
        if (!alertModal || !alertMessage) {
            console.error("Modal de alerta não encontrado!");
            alert(message); // Fallback
            if (typeof onConfirm === 'function') onConfirm();
            return;
        }
        alertMessage.textContent = message;
        alertCallback = onConfirm;
        openModal(alertModal); // Usa a função centralizada
    }

    // Formata a data para YYYY-MM-DD
    function formatDate(date) {
        if (!(date instanceof Date) || isNaN(date)) {
            console.error("formatDate recebeu um valor inválido:", date);
            return 'invalid-date';
        }
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }

    // --- Lógica Principal do Calendário ---
    async function renderCalendar(baseDate) {
        if (!grid || !currentWeekDisplay || !prevWeekBtn || !nextWeekBtn) {
            console.error("Elementos essenciais do calendário não encontrados.");
            showCustomAlert("Erro ao carregar a estrutura do calendário."); // Informa o usuário
            return;
        }

        calendarRendered = true;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        grid.innerHTML = '<div class="loading-placeholder">Carregando horários...</div>';
        grid.classList.add('loading');

        const startOfPeriod = new Date(baseDate); startOfPeriod.setHours(0, 0, 0, 0);
        const endOfPeriod = new Date(startOfPeriod); endOfPeriod.setDate(startOfPeriod.getDate() + 2);

        // Formata cabeçalho da data
        const startDay = startOfPeriod.getDate(); const endDay = endOfPeriod.getDate();
        let newHeaderText = '';
        if (startOfPeriod.getMonth() === endOfPeriod.getMonth()) {
            let monthName = startOfPeriod.toLocaleDateString('pt-BR', { month: 'long' });
            newHeaderText = `De ${startDay} a ${endDay} de ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
        } else {
            let startMonthName = startOfPeriod.toLocaleDateString('pt-BR', { month: 'long' });
            let endMonthName = endOfPeriod.toLocaleDateString('pt-BR', { month: 'long' });
            newHeaderText = `De ${startDay} de ${startMonthName.charAt(0).toUpperCase() + startMonthName.slice(1)} a ${endDay} de ${endMonthName.charAt(0).toUpperCase() + endMonthName.slice(1)}`;
        }
        currentWeekDisplay.textContent = newHeaderText;
        prevWeekBtn.disabled = startOfPeriod <= today;

        // Renderiza cabeçalho da grade
        grid.innerHTML = '';
        grid.insertAdjacentHTML('beforeend', `<div class="grid-header" style="border-left: none;"></div>`);
        const periodDays = [];
        for (let i = 0; i < 3; i++) {
            const day = new Date(startOfPeriod); day.setDate(startOfPeriod.getDate() + i); periodDays.push(day);
            const dayName = day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
            grid.insertAdjacentHTML('beforeend', `<div class="grid-header">${dayName}<br><span style="font-weight: 400; font-size: 0.9em;">${day.getDate()}</span></div>`);
        }

        // Busca e renderiza horários
        try {
            const fetchPromises = periodDays.map(day => fetch(`${API_URL}/api/horarios?date=${formatDate(day)}`));
            const responses = await Promise.all(fetchPromises);

             for(const res of responses) {
                if (!res.ok) {
                    let errorMsg = `Erro ${res.status}.`;
                    console.error(`Falha na API: ${res.status} ${res.statusText}`);
                    try { const d = await res.json(); errorMsg = d.error || errorMsg; console.error("Erro API:", d);} catch(e){}
                    throw new Error(errorMsg);
                }
            }
            const periodAvailability = await Promise.all(responses.map(res => res.json()));

            for (let hour = workHours.start; hour < workHours.end; hour++) {
                for (let minutes of [0, 30]) {
                    const timeString = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    grid.insertAdjacentHTML('beforeend', `<div class="time-label">${timeString}</div>`);
                    for (let dayIndex = 0; dayIndex < 3; dayIndex++) {
                        const currentDayInLoop = periodDays[dayIndex];
                        const availableSlotsForDay = periodAvailability[dayIndex];
                        let isPast = (currentDayInLoop < today) || (currentDayInLoop.getTime() === today.getTime() && (new Date().getHours() > hour || (new Date().getHours() === hour && new Date().getMinutes() >= minutes)));
                        const isAvailable = Array.isArray(availableSlotsForDay) && availableSlotsForDay.includes(timeString);
                        let slotText = 'Agendar'; let availabilityClass = '';
                        if (isPast) { slotText = '---'; availabilityClass = 'past-day'; }
                        else if (!isAvailable) { slotText = 'Ocupado'; availabilityClass = 'unavailable'; }
                        grid.insertAdjacentHTML('beforeend', `<div class="time-slot ${availabilityClass}" data-date="${formatDate(currentDayInLoop)}" data-time="${timeString}">${slotText}</div>`);
                    }
                }
            }
        } catch (error) {
            console.error("Erro detalhado ao buscar/renderizar horários:", error);
            grid.innerHTML = `<p style="color: #ff4d4d; grid-column: 1 / -1; text-align: center; padding: 20px;">${error.message || 'Erro ao carregar horários. Tente novamente mais tarde.'}</p>`;
            calendarRendered = false; // Permite tentar recarregar
        } finally {
            grid.classList.remove('loading');
            const placeholder = grid.querySelector('.loading-placeholder');
            if(placeholder) placeholder.remove();
        }
    }

    // --- Event Listeners ---

    // Função para lidar com clique nos botões de abrir calendário
    const handleOpenCalendar = () => {
        if (!calendarModal) {
             console.error("Modal do calendário não encontrado!");
             showCustomAlert("Erro ao tentar abrir o calendário.");
             return;
        }
        openModal(calendarModal); // Usa função centralizada
        if (!calendarRendered) {
            renderCalendar(currentDay);
        }
    };

    // Liga a função aos botões existentes
    if (openCalendarButton) openCalendarButton.addEventListener('click', handleOpenCalendar);
    if (ctaButton) ctaButton.addEventListener('click', handleOpenCalendar);

    // Fechar Modais (usando a função centralizada)
    if (closeCalendarButton) closeCalendarButton.addEventListener('click', () => closeModal(calendarModal));
    if (closeBookingModalBtn) closeBookingModalBtn.addEventListener('click', () => closeModal(bookingModal));
    if (alertCloseButton) {
        alertCloseButton.addEventListener('click', () => {
            closeModal(alertModal);
            if (typeof alertCallback === 'function') { alertCallback(); }
        });
    }

    // Fechar Modais clicando fora
    [calendarModal, bookingModal, alertModal].forEach(modalElement => {
        if (modalElement) {
            modalElement.addEventListener('click', (event) => {
                if (event.target === modalElement) {
                    closeModal(modalElement);
                }
            });
        }
    });

    // Navegação do Calendário
    if (prevWeekBtn && nextWeekBtn) {
        prevWeekBtn.addEventListener('click', () => { currentDay.setDate(currentDay.getDate() - 3); renderCalendar(currentDay); });
        nextWeekBtn.addEventListener('click', () => { currentDay.setDate(currentDay.getDate() + 3); renderCalendar(currentDay); });
    }

    // Listener para Atualizar Nome do Arquivo Selecionado
    if (imagemInput && fileNameSpan) {
        imagemInput.addEventListener('change', () => {
            if (imagemInput.files && imagemInput.files.length > 0) {
                fileNameSpan.textContent = imagemInput.files[0].name;
            } else {
                fileNameSpan.textContent = 'Nenhum arquivo selecionado';
            }
        });
    } else {
        console.warn("Elementos 'ideia-imagem' ou 'file-name' não encontrados no formulário.");
    }

    // Abrir Modal de Formulário ao clicar em um horário
    if (grid) {
        grid.addEventListener('click', (event) => {
            const target = event.target;
            if (target.matches('.time-slot:not(.unavailable):not(.past-day)')) {
                const date = target.dataset.date; const time = target.dataset.time;
                const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
                if(modalInfo) modalInfo.textContent = `Você está agendando para ${formattedDate} às ${time}.`;
                if(bookingForm) {
                    bookingForm.dataset.date = date; bookingForm.dataset.time = time;
                    bookingForm.reset(); // Limpa campos do formulário
                }
                if(fileNameSpan) fileNameSpan.textContent = 'Nenhum arquivo selecionado'; // Reseta nome do arquivo
                closeModal(calendarModal); // Fecha modal do calendário
                openModal(bookingModal);  // Abre modal do formulário
            }
        });
    }

    // Formatação do Telefone
    if (telefoneInput) {
        telefoneInput.addEventListener('input', (evento) => {
            let valor = evento.target.value.replace(/\D/g, '').substring(0, 11);
            let valorFormatado = '';
             if (valor.length > 10) valorFormatado = `(${valor.substring(0, 2)}) ${valor.substring(2, 7)}-${valor.substring(7, 11)}`;
            else if (valor.length > 6) valorFormatado = `(${valor.substring(0, 2)}) ${valor.substring(2, 6)}-${valor.substring(6, 10)}`;
            else if (valor.length > 2) valorFormatado = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
            else if (valor.length > 0) valorFormatado = `(${valor}`;
            evento.target.value = valorFormatado;
        });
    }

    // Submit do Formulário de Agendamento
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const numeroLimpo = telefoneInput.value.replace(/\D/g, '');
            if (numeroLimpo.length < 10 || numeroLimpo.length > 11) {
                showCustomAlert('Por favor, insira um número de telefone válido com DDD (10 ou 11 dígitos).');
                return;
            }

            const formData = new FormData();
            formData.append('date', bookingForm.dataset.date);
            formData.append('time', bookingForm.dataset.time);
            formData.append('nome', nomeInput.value);
            formData.append('telefone', telefoneInput.value);
            formData.append('ideia', ideiaInput.value);
            formData.append('tamanho', tamanhoInput.value);
            formData.append('local', localInput.value);
            if (imagemInput.files.length > 0) formData.append('ideia-imagem', imagemInput.files[0]);

            const submitButton = bookingForm.querySelector('button');
            submitButton.textContent = 'Agendando...'; submitButton.disabled = true;
            try {
                const response = await fetch(`${API_URL}/api/agendar`, { method: 'POST', body: formData });

                if (!response.ok) {
                    let errorMsg = `Erro ${response.status}.`;
                    try { const d=await response.json(); errorMsg = d.error || errorMsg;} catch(e){}

                    if (response.status === 409) { // Conflito de horário
                        closeModal(bookingModal);
                        openModal(calendarModal);
                        renderCalendar(currentDay); // Recarrega calendário
                        showCustomAlert(errorMsg || 'Este horário foi ocupado. Escolha outro.');
                    } else { // Outros erros do servidor
                         throw new Error(errorMsg);
                    }
                    return; // Importante sair aqui após tratar o erro
                }

                const result = await response.json();
                closeModal(bookingModal);
                const mensagem = encodeURIComponent(`Olá! Confirmei agendamento ${formData.get('date')} ${formData.get('time')}. Nome ${formData.get('nome')}.`);
                showCustomAlert("Agendamento confirmado! Redirecionando para o WhatsApp...", () => {
                    calendarRendered = false; // Força recarregar calendário na próxima abertura
                    setTimeout(() => { window.location.href = `https://wa.me/${result.whatsappNumber}?text=${mensagem}`; }, 500);
                });
            } catch (error) { // Erros de rede ou erros lançados manualmente
                showCustomAlert(error.message || 'Ocorreu um erro inesperado ao agendar. Verifique sua conexão.');
                console.error("Erro no submit do formulário:", error);
            } finally {
                submitButton.textContent = 'Confirmar Agendamento';
                submitButton.disabled = false;
            }
        });
    } else {
        console.error("Formulário de agendamento não encontrado!");
    }

    console.log("Script calendar.js carregado e pronto.");

}); // Fim do DOMContentLoaded
