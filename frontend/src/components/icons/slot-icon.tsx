type Props = {
  code: string;
};

const getIcon = (code: string) => {
  switch (code) {
    case "Hand":
      return <i className="icon-hand_inverted" />;
    case "Hand x2":
      return <i className="icon-hand_x2_inverted" />;
    case "Accessory":
      return <i className="icon-accessory_inverted" />;
    case "Ally":
      return <i className="icon-ally_inverted" />;
    case "Arcane":
      return <i className="icon-arcane_inverted" />;
    case "Arcane x2":
      return <i className="icon-arcane_x2_inverted" />;
    case "Body":
      return <i className="icon-body_inverted" />;
    case "Tarot":
      return <i className="icon-tarot_inverted" />;
    case "Head":
      return <i className="icon-head_inverted" />;
    default:
      return null;
  }
};

function SlotIcon(props: Props) {
  const Icon = getIcon(props.code);
  return Icon ? Icon : null;
}

export default SlotIcon;
