import {Component,type ReactNode} from 'react';

type Props={children:ReactNode;onFailure:(message:string)=>void;fallback:ReactNode};
type State={failed:boolean};
export default class FieldErrorBoundary extends Component<Props,State>{
 state:State={failed:false};
 static getDerivedStateFromError():State{return {failed:true};}
 componentDidCatch(error:Error){
  console.error('[Electric Football] 3D field failed to initialize',error);
  this.props.onFailure(error?.message??'Unknown rendering error');
 }
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
