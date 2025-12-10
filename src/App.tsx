
import { Providers } from "./hooks/providers";
import NavigatorBrowser from "./navigate/navigator";



const App: React.FC = () => {
  return (

    <Providers>
      <NavigatorBrowser />
    </Providers>


  );
};

export default App;
