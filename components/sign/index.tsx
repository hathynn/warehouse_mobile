import React, { useRef } from "react";
import SignatureScreen, {
  SignatureViewRef,
} from "react-native-signature-canvas";

interface Props {
  text: string;
  onOK: (signature : any) => void;
}

const Sign: React.FC<Props> = ({ text, onOK }) => {
  const ref = useRef<SignatureViewRef>(null);

  const handleSignature = (signature : any) => {
    console.log(signature);
    onOK(signature);
  };

  const handleEmpty = () => {
    console.log("Empty");
  };

  const handleClear = () => {
    console.log("clear success!");
  };

  const handleEnd = () => {
    ref.current?.readSignature();
  };

  return (
    <SignatureScreen
      ref={ref}
      onEnd={handleEnd}
      onOK={handleSignature}
      onEmpty={handleEmpty}
      onClear={handleClear}
      autoClear={true}
      descriptionText={text}
    />
  );
};

export default Sign;