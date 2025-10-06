//Componente Rodapé:
export default function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container py-8 text-sm text-muted-foreground flex flex-col gap-2 sm:flex-row items-center justify-between">
        <p>© {new Date().getFullYear()} Collab2Us. Todos os direitos reservados.</p>
        <p className="text-xs">Construa produtos melhores unindo Miro ↔ Trello</p>
      </div>
    </footer>
  );
}
