describe('Flujos completos: Login, validaciones, edición y eliminación - RenalCare', () => {
  before(() => {
    cy.visit('https://johnbeta1977.github.io/renal001/');
  });

  it('Realiza el registro de perfil correctamente', () => {
    // Llena el formulario de perfil con los datos proporcionados
    cy.get('#profile-section').should('be.visible');
    cy.get('input[name="nombre"]').clear().type('John Betancur');
    cy.get('input[name="tipo-sangre"]').clear().type('o+');
    cy.get('input[name="ips"]').clear().type('salud total');
    cy.get('input[name="clinica-hemodialisis"]').clear().type('fresenius');
    cy.get('#dialysis-type-select').select('hemodialysis');
    cy.get('input[name="contacto-emergencia"]').clear().type('Yarima Mandon');
    cy.get('input[name="telefono-emergencia"]').clear().type('3205893469');
    cy.get('#profile-save-button').click();

    // Espera confirmación de guardado exitoso
    cy.contains('Perfil guardado correctamente').should('exist');
  });

  it('Valida que no se puede guardar el perfil si falta un campo requerido', () => {
    cy.get('#profile-section').should('be.visible');
    // Borra un campo requerido
    cy.get('input[name="nombre"]').clear();
    cy.get('#profile-save-button').click();
    // Verifica que aparece un error por campo requerido
    cy.contains('Por favor, completa todos los campos requeridos').should('exist');
    // Restaura el campo para las siguientes pruebas
    cy.get('input[name="nombre"]').type('John Betancur');
  });

  it('Permite editar un dato del perfil y lo guarda', () => {
    cy.get('input[name="ips"]').clear().type('SURA');
    cy.get('#profile-save-button').click();
    cy.contains('Perfil guardado correctamente').should('exist');
    // Verifica que el campo se haya actualizado
    cy.get('input[name="ips"]').should('have.value', 'SURA');
    // Deja el perfil como estaba para futuras pruebas
    cy.get('input[name="ips"]').clear().type('salud total');
    cy.get('#profile-save-button').click();
  });

  it('Agrega y elimina un resultado de laboratorio', () => {
    cy.get('#nav-labs').click();
    cy.get('#labs-section').should('be.visible');
    cy.get('input[name="new-lab-test-name"]').type('Hemoglobina');
    cy.get('input[name="new-lab-result-value"]').type('14');
    cy.get('input[name="new-lab-result-date"]').type('2025-07-30');
    cy.get('#add-new-lab-result-button').click();
    // Espera mensaje de éxito y que aparezca en la lista
    cy.contains('Resultado de laboratorio agregado').should('exist');
    cy.get('#labs-list').contains('Hemoglobina').parent().as('labItem');
    // Elimina el registro recién agregado
    cy.get('@labItem').find('.delete-labs-entry').click();
    cy.contains('Registro eliminado.').should('exist');
    // Verifica que ya no está en la lista
    cy.get('#labs-list').should('not.contain', 'Hemoglobina');
  });
});
