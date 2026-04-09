import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

describe("VoteSimple", function () {
  async function deploiementFixture() {
    const [proprietaire, electeur1, electeur2, electeur3, visiteur] =
      await ethers.getSigners();

    const nomsCandidats = ["Alice", "Bob", "Charlie"];

    const contrat = await ethers.deployContract("VoteSimple", [nomsCandidats]);

    return {
      contrat,
      proprietaire,
      electeur1,
      electeur2,
      electeur3,
      visiteur,
      nomsCandidats,
    };
  }

  describe("Déploiement", function () {
    it("Doit bien initialiser le propriétaire", async function () {
      const { contrat, proprietaire } = await networkHelpers.loadFixture(deploiementFixture);

      expect(await contrat.proprietaire()).to.equal(proprietaire.address);
    });

    it("Doit bien initialiser les candidats", async function () {
      const { contrat } = await networkHelpers.loadFixture(deploiementFixture);

      expect(await contrat.obtenirNombreCandidats()).to.equal(3n);

      const candidat0 = await contrat.obtenirCandidat(0);
      const candidat1 = await contrat.obtenirCandidat(1);
      const candidat2 = await contrat.obtenirCandidat(2);

      expect(candidat0[0]).to.equal("Alice");
      expect(candidat0[1]).to.equal(0n);

      expect(candidat1[0]).to.equal("Bob");
      expect(candidat1[1]).to.equal(0n);

      expect(candidat2[0]).to.equal("Charlie");
      expect(candidat2[1]).to.equal(0n);
    });

    it("Doit démarrer avec le vote fermé", async function () {
      const { contrat } = await networkHelpers.loadFixture(deploiementFixture);

      expect(await contrat.voteOuvert()).to.equal(false);
    });
  });

  describe("Gestion des électeurs", function () {
    it("L'administrateur peut ajouter un électeur", async function () {
      const { contrat, electeur1 } = await networkHelpers.loadFixture(deploiementFixture);

      await expect(contrat.ajouterElecteur(electeur1.address))
        .to.emit(contrat, "ElecteurAjoute")
        .withArgs(electeur1.address);

      expect(await contrat.electeursAutorises(electeur1.address)).to.equal(true);
    });

    it("Un non-admin ne peut pas ajouter un électeur", async function () {
      const { contrat, electeur1, visiteur } = await networkHelpers.loadFixture(deploiementFixture);

      await expect(
        contrat.connect(visiteur).ajouterElecteur(electeur1.address)
      ).to.be.revertedWith("Vous n'etes pas l'administrateur");
    });

    it("On ne peut pas ajouter deux fois le meme électeur", async function () {
      const { contrat, electeur1 } = await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ajouterElecteur(electeur1.address);

      await expect(
        contrat.ajouterElecteur(electeur1.address)
      ).to.be.revertedWith("Electeur deja ajoute");
    });

    it("On ne peut pas ajouter l'adresse zero", async function () {
      const { contrat } = await networkHelpers.loadFixture(deploiementFixture);

      await expect(
        contrat.ajouterElecteur(ethers.ZeroAddress)
      ).to.be.revertedWith("Adresse invalide");
    });
  });

  describe("Ouverture du vote", function () {
    it("L'administrateur peut ouvrir le vote", async function () {
      const { contrat } = await networkHelpers.loadFixture(deploiementFixture);

      await expect(contrat.ouvrirLeVote())
        .to.emit(contrat, "VoteOuvert");

      expect(await contrat.voteOuvert()).to.equal(true);
    });

    it("Un non-admin ne peut pas ouvrir le vote", async function () {
      const { contrat, visiteur } = await networkHelpers.loadFixture(deploiementFixture);

      await expect(
        contrat.connect(visiteur).ouvrirLeVote()
      ).to.be.revertedWith("Vous n'etes pas l'administrateur");
    });

    it("On ne peut pas ouvrir deux fois le vote", async function () {
      const { contrat } = await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ouvrirLeVote();

      await expect(
        contrat.ouvrirLeVote()
      ).to.be.revertedWith("Le vote est deja ouvert");
    });
  });

  describe("Vote", function () {
    it("Un électeur autorisé peut voter", async function () {
      const { contrat, electeur1 } = await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ajouterElecteur(electeur1.address);
      await contrat.ouvrirLeVote();

      await expect(
        contrat.connect(electeur1).voter(1)
      ).to.emit(contrat, "VoteEffectue").withArgs(electeur1.address, 1n);

      const candidat = await contrat.obtenirCandidat(1);

      expect(candidat[0]).to.equal("Bob");
      expect(candidat[1]).to.equal(1n);
      expect(await contrat.aDejaVote(electeur1.address)).to.equal(true);
    });

    it("Un électeur ne peut voter qu'une seule fois", async function () {
      const { contrat, electeur1 } = await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ajouterElecteur(electeur1.address);
      await contrat.ouvrirLeVote();

      await contrat.connect(electeur1).voter(0);

      await expect(
        contrat.connect(electeur1).voter(1)
      ).to.be.revertedWith("Vous avez deja vote");
    });

    it("Un non-électeur ne peut pas voter", async function () {
      const { contrat, visiteur } = await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ouvrirLeVote();

      await expect(
        contrat.connect(visiteur).voter(0)
      ).to.be.revertedWith("Vous n'etes pas autorise a voter");
    });

    it("On ne peut pas voter si le vote est ferme", async function () {
      const { contrat, electeur1 } = await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ajouterElecteur(electeur1.address);

      await expect(
        contrat.connect(electeur1).voter(0)
      ).to.be.revertedWith("Le vote est ferme");
    });

    it("On ne peut pas voter pour un candidat inexistant", async function () {
      const { contrat, electeur1 } = await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ajouterElecteur(electeur1.address);
      await contrat.ouvrirLeVote();

      await expect(
        contrat.connect(electeur1).voter(99)
      ).to.be.revertedWith("Candidat inexistant");
    });
  });

  describe("Résultats", function () {
    it("La fonction obtenirGagnant retourne le bon candidat", async function () {
      const { contrat, electeur1, electeur2, electeur3 } =
        await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ajouterElecteur(electeur1.address);
      await contrat.ajouterElecteur(electeur2.address);
      await contrat.ajouterElecteur(electeur3.address);

      await contrat.ouvrirLeVote();

      await contrat.connect(electeur1).voter(1); 
      await contrat.connect(electeur2).voter(1); 
      await contrat.connect(electeur3).voter(0); 

      const gagnant = await contrat.obtenirGagnant();

      expect(gagnant[0]).to.equal("Bob");
      expect(gagnant[1]).to.equal(2n);
    });

    it("En cas d'égalité, le premier candidat ayant le meilleur score reste gagnant", async function () {
      const { contrat, electeur1, electeur2 } =
        await networkHelpers.loadFixture(deploiementFixture);

      await contrat.ajouterElecteur(electeur1.address);
      await contrat.ajouterElecteur(electeur2.address);

      await contrat.ouvrirLeVote();

      await contrat.connect(electeur1).voter(0); 
      await contrat.connect(electeur2).voter(1); 

      const gagnant = await contrat.obtenirGagnant();

      expect(gagnant[0]).to.equal("Alice");
      expect(gagnant[1]).to.equal(1n);
    });
  });
});