/** Création par l'interface, sans contourner la vérification du mot de passe. */
export async function creerProfil(page,nom='Citoyen test',mdp='12') {
  await page.getByTestId('compte-nom').fill(nom);
  await page.getByTestId('login-password').fill(mdp);
  await page.getByTestId('compte-confirmation').fill(mdp);
  await page.getByTestId('compte-creer').click();
  await page.getByTestId('login-submit').waitFor();
}
